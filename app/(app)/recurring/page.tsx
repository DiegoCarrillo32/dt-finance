'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, PauseCircle, PlayCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { CurrencyToggle } from '@/components/CurrencyToggle'
import { RecurringForm } from '@/components/forms/RecurringForm'
import {
  getRecurringWithStatus,
  deleteRecurring,
  toggleRecurringActive,
  markRecurringPaid,
  unmarkRecurringPaid,
} from '@/lib/actions/recurring'
import { getMonthlySummary, type MonthlySummary } from '@/lib/actions/income'
import { getAccounts } from '@/lib/actions/accounts'
import { getCategories } from '@/lib/actions/categories'
import { formatCurrency, getDayOfMonthSuffix } from '@/lib/utils'
import type { Account, Category, Currency, RecurringExpense } from '@/lib/types'

type RecurringWithStatus = RecurringExpense & {
  paid: boolean
  paid_transaction_id: string | null
  due_this_month: boolean
  ended: boolean
}

const FREQUENCY_LABEL: Record<number, string> = {
  1: 'Every month',
  3: 'Every 3 months',
  6: 'Every 6 months',
  12: 'Every year',
}

function scheduleText(r: RecurringWithStatus): string {
  const freq = FREQUENCY_LABEL[r.frequency_months] ?? 'Every month'
  let text = `${freq} on the ${getDayOfMonthSuffix(r.day_of_month)}`
  if (r.end_date) {
    const end = new Date(r.end_date + 'T00:00:00')
    text += ` · until ${end.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
  }
  return text
}

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringWithStatus[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RecurringExpense | null>(null)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [pending, startTransition] = useTransition()

  async function load() {
    const [data, accs, cats] = await Promise.all([
      getRecurringWithStatus(),
      getAccounts(),
      getCategories(),
    ])
    setItems(data as RecurringWithStatus[])
    setAccounts(accs as Account[])
    setCategories(cats as Category[])
  }

  useEffect(() => {
    startTransition(() => { load() })
  }, [])

  // Reload the headline summary whenever the display currency changes (and after edits).
  useEffect(() => {
    getMonthlySummary(currency).then(setSummary)
  }, [currency, items])

  function handleDelete(id: string) {
    if (!confirm('Delete this recurring expense?')) return
    startTransition(async () => {
      await deleteRecurring(id)
      load()
    })
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleRecurringActive(id, !active)
      load()
    })
  }

  function handleMarkPaid(id: string) {
    startTransition(async () => {
      await markRecurringPaid(id)
      load()
    })
  }

  function handleUnmarkPaid(transactionId: string | null) {
    if (!transactionId) return
    if (!confirm('Mark as pending again? This removes the payment recorded for this month.')) return
    startTransition(async () => {
      await unmarkRecurringPaid(transactionId)
      load()
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-heading text-3xl text-expresso">Recurring Expenses</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Recurring</span>
        </Button>
      </div>

      {/* Monthly summary: income vs recurring vs what's left */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold text-expresso">Monthly Summary</h2>
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryStat
            label="Monthly income"
            value={summary ? formatCurrency(summary.income, summary.currency) : '—'}
            tone="positive"
          />
          <SummaryStat
            label="Recurring / month"
            value={summary ? formatCurrency(summary.recurring, summary.currency) : '—'}
            tone="negative"
          />
          <SummaryStat
            label="Left after recurring"
            value={summary ? formatCurrency(summary.leftAfterRecurring, summary.currency) : '—'}
            tone={summary && summary.leftAfterRecurring < 0 ? 'negative' : 'positive'}
          />
          <SummaryStat
            label="Spent this month"
            value={summary ? formatCurrency(summary.spent, summary.currency) : '—'}
            tone="neutral"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Income is your set monthly salary; recurring amortizes non-monthly bills (e.g. quarterly).
          &ldquo;Spent this month&rdquo; is your actual logged transactions. Set your income in Settings.
        </p>
      </Card>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Toggle paid / pending (resets monthly)
        </span>
        <span className="flex items-center gap-1.5">
          <PauseCircle className="h-3.5 w-3.5 text-amber-500" /> Pause (stop tracking)
        </span>
        <span className="flex items-center gap-1.5">
          <PlayCircle className="h-3.5 w-3.5 text-green-600" /> Resume tracking
        </span>
      </div>

      {pending && items.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <SkeletonRows count={5} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No recurring expenses yet.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-warm-roast/10">
            {items.map((r) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cat = r.category as any
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: cat?.color ?? '#7a1318' }}
                    >
                      {r.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{scheduleText(r)}</p>
                    </div>
                    <span className="text-sm font-bold text-red-500 shrink-0">
                      {formatCurrency(r.amount_cents, r.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1 shrink-0">
                    <Badge
                      variant={
                        !r.active ? 'muted'
                          : r.ended ? 'muted'
                          : !r.due_this_month ? 'default'
                          : r.paid ? 'success'
                          : 'warning'
                      }
                    >
                      {!r.active ? 'Paused'
                        : r.ended ? 'Ended'
                        : !r.due_this_month ? 'Not due'
                        : r.paid ? 'Paid'
                        : 'Pending'}
                    </Badge>

                    {/* Mark as paid / back to pending — only when due this month */}
                    {r.active && r.due_this_month && (
                      <IconButton
                        variant="success"
                        active={r.paid}
                        onClick={() =>
                          r.paid ? handleUnmarkPaid(r.paid_transaction_id) : handleMarkPaid(r.id)
                        }
                        title={
                          r.paid
                            ? 'Paid this month — click to mark as pending again'
                            : 'Mark as paid — records a transaction'
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </IconButton>
                    )}

                    {/* Pause / Resume */}
                    <IconButton
                      onClick={() => handleToggle(r.id, r.active)}
                      title={r.active ? 'Pause — stop tracking this expense' : 'Resume tracking'}
                    >
                      {r.active ? (
                        <PauseCircle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-green-600" />
                      )}
                    </IconButton>

                    <IconButton onClick={() => setEditing(r)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton variant="danger" onClick={() => handleDelete(r.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Recurring Expense">
        <RecurringForm
          accounts={accounts}
          categories={categories}
          onSuccess={() => {
            setShowForm(false)
            startTransition(() => { load() })
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Recurring Expense">
        {editing && (
          <RecurringForm
            accounts={accounts}
            categories={categories}
            recurring={editing}
            onSuccess={() => {
              setEditing(null)
              startTransition(() => { load() })
            }}
          />
        )}
      </Modal>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'positive' | 'negative' | 'neutral'
}) {
  const color =
    tone === 'positive' ? 'text-green-600' : tone === 'negative' ? 'text-red-500' : 'text-expresso'
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${color}`}>{value}</p>
    </div>
  )
}
