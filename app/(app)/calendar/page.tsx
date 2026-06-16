'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { getRecurringExpenses } from '@/lib/actions/recurring'
import { getSubscriptions } from '@/lib/actions/subscriptions'
import { getDebts } from '@/lib/actions/debts'
import { formatCurrency } from '@/lib/utils'
import { queryKeys } from '@/lib/queryKeys'
import type { Debt, RecurringExpense, Subscription } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecurringDueInMonth(
  r: { frequency_months: number; start_date: string | null; active: boolean },
  year: number,
  month: number,
): boolean {
  if (!r.active) return false
  const freq = r.frequency_months || 1
  if (freq === 1) return true
  if (!r.start_date) return true
  const startYear = Number(r.start_date.slice(0, 4))
  const startMonth = Number(r.start_date.slice(5, 7))
  const diff = year * 12 + month - 1 - (startYear * 12 + startMonth - 1)
  return diff >= 0 && diff % freq === 0
}

function buildCalendarDays(
  year: number,
  month: number,
): { day: number; isCurrentMonth: boolean; date: Date }[] {
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrev = new Date(year, month - 1, 0).getDate()
  const days: { day: number; isCurrentMonth: boolean; date: Date }[] = []

  // Fill previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: daysInPrev - i,
      isCurrentMonth: false,
      date: new Date(year, month - 2, daysInPrev - i),
    })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, isCurrentMonth: true, date: new Date(year, month - 1, d) })
  }

  // Fill next month days to complete last row
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, isCurrentMonth: false, date: new Date(year, month, d) })
    }
  }

  return days
}

// ---------------------------------------------------------------------------
// Types for calendar events
// ---------------------------------------------------------------------------

type CalendarEventType = 'recurring' | 'subscription' | 'debt'

interface CalendarEvent {
  day: number
  name: string
  amount_cents: number
  currency: string
  type: CalendarEventType
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const now = new Date()
  const [viewDate, setViewDate] = useState<Date>(new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() + 1

  // The underlying data is month-independent; events for the viewed month are
  // derived client-side, so changing months never needs a refetch.
  const recurringQuery = useQuery({
    queryKey: queryKeys.recurringList,
    queryFn: () => getRecurringExpenses() as Promise<RecurringExpense[]>,
  })
  const subscriptionsQuery = useQuery({
    queryKey: queryKeys.subscriptions,
    queryFn: () => getSubscriptions() as Promise<Subscription[]>,
  })
  const debtsQuery = useQuery({
    queryKey: queryKeys.debts,
    queryFn: () => getDebts() as Promise<Debt[]>,
  })

  const recurring = recurringQuery.data ?? []
  const subscriptions = subscriptionsQuery.data ?? []
  const debts = debtsQuery.data ?? []
  const isPending =
    recurringQuery.isPending || subscriptionsQuery.isPending || debtsQuery.isPending

  function prevMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  function nextMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const monthLabel = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const calendarDays = buildCalendarDays(year, month)

  // Build events for the viewed month
  const events: CalendarEvent[] = []

  for (const r of recurring) {
    if (isRecurringDueInMonth(r, year, month)) {
      events.push({
        day: r.day_of_month,
        name: r.name,
        amount_cents: r.amount_cents,
        currency: r.currency,
        type: 'recurring',
      })
    }
  }

  for (const s of subscriptions) {
    if (!s.next_billing_date) continue
    const billingDate = new Date(s.next_billing_date + 'T00:00:00')
    if (billingDate.getFullYear() === year && billingDate.getMonth() + 1 === month) {
      events.push({
        day: billingDate.getDate(),
        name: s.name,
        amount_cents: s.amount_cents,
        currency: s.currency,
        type: 'subscription',
      })
    }
  }

  for (const d of debts) {
    if (d.due_day_of_month == null) continue
    events.push({
      day: d.due_day_of_month,
      name: d.name,
      amount_cents: d.minimum_payment_cents,
      currency: d.currency,
      type: 'debt',
    })
  }

  // Map day -> events for quick lookup
  const eventsByDay = new Map<number, CalendarEvent[]>()
  for (const ev of events) {
    const list = eventsByDay.get(ev.day) ?? []
    list.push(ev)
    eventsByDay.set(ev.day, list)
  }

  // Events sorted by day for the list below the calendar
  const sortedEventDays = Array.from(eventsByDay.keys()).sort((a, b) => a - b)

  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth() + 1
  const todayDay = now.getDate()
  const isViewingCurrentMonth = year === todayYear && month === todayMonth

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function dotColor(type: CalendarEventType): string {
    if (type === 'recurring') return 'bg-red-500'
    if (type === 'subscription') return 'bg-purple-500'
    return 'bg-orange-500'
  }

  function badgeVariant(type: CalendarEventType): 'danger' | 'default' | 'warning' {
    if (type === 'recurring') return 'danger'
    if (type === 'subscription') return 'default'
    return 'warning'
  }

  function badgeLabel(type: CalendarEventType): string {
    if (type === 'recurring') return 'Recurring'
    if (type === 'subscription') return 'Subscription'
    return 'Debt Payment'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-expresso">Financial Calendar</h1>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-warm-roast/10 text-expresso"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-bold text-expresso min-w-40 text-center">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-warm-roast/10 text-expresso"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isPending ? (
        <SkeletonCards count={3} />
      ) : (
        <>
          {/* Calendar grid */}
          <Card className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-bold text-muted-foreground py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map(({ day, isCurrentMonth, date }, idx) => {
                const isToday =
                  isViewingCurrentMonth &&
                  isCurrentMonth &&
                  day === todayDay
                const dayEvents = isCurrentMonth ? (eventsByDay.get(day) ?? []) : []

                // Deduplicate dot types
                const dotTypes = Array.from(new Set(dayEvents.map((e) => e.type)))

                return (
                  <div
                    key={idx}
                    className={`min-h-[56px] p-1 rounded-lg flex flex-col items-center gap-1 ${
                      isCurrentMonth ? '' : 'opacity-30'
                    }`}
                  >
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-warm-roast text-white'
                          : 'text-expresso'
                      }`}
                    >
                      {day}
                    </span>
                    {dotTypes.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {dotTypes.map((type) => (
                          <span
                            key={type}
                            className={`w-1.5 h-1.5 rounded-full ${dotColor(type)}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-warm-roast/10">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                Recurring
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                Subscription
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                Debt Payment
              </span>
            </div>
          </Card>

          {/* Events this month list */}
          <div className="space-y-2">
            <h2 className="font-bold text-expresso">Events This Month</h2>
            {sortedEventDays.length === 0 ? (
              <Card>
                <p className="text-sm text-muted-foreground">No financial events this month.</p>
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                <ul className="divide-y divide-warm-roast/10">
                  {sortedEventDays.map((day) => {
                    const dayEvs = eventsByDay.get(day) ?? []
                    return dayEvs.map((ev, i) => (
                      <li
                        key={`${day}-${ev.type}-${i}`}
                        className="flex items-center gap-3 p-4"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warm-roast/10 shrink-0">
                          <span className="text-xs font-bold text-warm-roast">{day}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-expresso truncate">{ev.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(ev.amount_cents, ev.currency as 'USD' | 'CRC')}
                          </p>
                        </div>
                        <Badge variant={badgeVariant(ev.type)}>{badgeLabel(ev.type)}</Badge>
                      </li>
                    ))
                  })}
                </ul>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
