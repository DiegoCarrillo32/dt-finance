'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { IconButton } from '@/components/ui/IconButton'
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  toggleSubscriptionActive,
  deleteSubscription,
  monthlyEquivalent,
  yearlyEquivalent,
} from '@/lib/actions/subscriptions'
import { formatCurrency, parseCentsInput, formatDate } from '@/lib/utils'
import type { BillingPeriod, Currency, Subscription } from '@/lib/types'

const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

const BILLING_PERIOD_OPTIONS = (Object.keys(BILLING_PERIOD_LABELS) as BillingPeriod[]).map((k) => ({
  value: k,
  label: BILLING_PERIOD_LABELS[k],
}))

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'CRC', label: 'CRC' },
]

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [pending, startTransition] = useTransition()

  async function load() {
    const data = await getSubscriptions()
    // Sort: active first, then by next_billing_date
    const sorted = [...(data as Subscription[])].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      if (!a.next_billing_date && !b.next_billing_date) return 0
      if (!a.next_billing_date) return 1
      if (!b.next_billing_date) return -1
      return a.next_billing_date.localeCompare(b.next_billing_date)
    })
    setSubscriptions(sorted)
  }

  useEffect(() => {
    startTransition(() => { load() })
  }, [])

  // Compute totals per currency (active subscriptions only)
  const activeUSD = subscriptions.filter((s) => s.active && s.currency === 'USD')
  const activeCRC = subscriptions.filter((s) => s.active && s.currency === 'CRC')

  const monthlyUSD = activeUSD.reduce(
    (sum, s) => sum + monthlyEquivalent(s.amount_cents, s.billing_period),
    0,
  )
  const yearlyUSD = activeUSD.reduce(
    (sum, s) => sum + yearlyEquivalent(s.amount_cents, s.billing_period),
    0,
  )
  const monthlyCRC = activeCRC.reduce(
    (sum, s) => sum + monthlyEquivalent(s.amount_cents, s.billing_period),
    0,
  )
  const yearlyCRC = activeCRC.reduce(
    (sum, s) => sum + yearlyEquivalent(s.amount_cents, s.billing_period),
    0,
  )

  const activeCount = subscriptions.filter((s) => s.active).length

  function handleDelete(sub: Subscription) {
    if (!confirm('Delete this item?')) return
    startTransition(async () => {
      await deleteSubscription(sub.id)
      load()
    })
  }

  function handleToggleActive(sub: Subscription) {
    startTransition(async () => {
      await toggleSubscriptionActive(sub.id, !sub.active)
      load()
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-heading text-3xl text-expresso">Subscriptions</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Subscription</span>
        </Button>
      </div>

      {/* Summary cards */}
      {(subscriptions.length > 0 || !pending) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="space-y-1">
            <p className="text-xs text-muted-foreground">Monthly (USD)</p>
            <p className="font-bold text-expresso text-lg">{formatCurrency(monthlyUSD, 'USD')}</p>
            {monthlyCRC > 0 && (
              <p className="text-xs text-muted-foreground">
                + {formatCurrency(monthlyCRC, 'CRC')} CRC
              </p>
            )}
          </Card>
          <Card className="space-y-1">
            <p className="text-xs text-muted-foreground">Yearly (USD)</p>
            <p className="font-bold text-expresso text-lg">{formatCurrency(yearlyUSD, 'USD')}</p>
            {yearlyCRC > 0 && (
              <p className="text-xs text-muted-foreground">
                + {formatCurrency(yearlyCRC, 'CRC')} CRC
              </p>
            )}
          </Card>
          <Card className="space-y-1 col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="font-bold text-expresso text-lg">
              {activeCount} / {subscriptions.length}
            </p>
          </Card>
        </div>
      )}

      {pending && subscriptions.length === 0 ? (
        <SkeletonCards count={3} />
      ) : subscriptions.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No subscriptions tracked yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const monthly = monthlyEquivalent(sub.amount_cents, sub.billing_period)

            return (
              <Card key={sub.id} className={sub.active ? '' : 'opacity-60'}>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-expresso">{sub.name}</h3>
                        <Badge variant="default">
                          {BILLING_PERIOD_LABELS[sub.billing_period]}
                        </Badge>
                        <Badge variant={sub.active ? 'success' : 'muted'}>
                          {sub.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton
                        variant={sub.active ? 'success' : 'default'}
                        active={sub.active}
                        aria-label={sub.active ? 'Deactivate subscription' : 'Activate subscription'}
                        onClick={() => handleToggleActive(sub)}
                      >
                        {sub.active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </IconButton>
                      <IconButton
                        variant="default"
                        aria-label="Edit subscription"
                        onClick={() => setEditing(sub)}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        variant="danger"
                        aria-label="Delete subscription"
                        onClick={() => handleDelete(sub)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  {/* Amount details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(sub.amount_cents, sub.currency)}{' '}
                        <span className="text-muted-foreground text-xs">
                          / {BILLING_PERIOD_LABELS[sub.billing_period].toLowerCase()}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Equivalent</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(monthly, sub.currency)}
                      </p>
                    </div>
                    {sub.next_billing_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Next Billing</p>
                        <p className="font-medium text-foreground">
                          {formatDate(sub.next_billing_date)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {sub.notes && (
                    <p className="text-xs text-muted-foreground border-t border-warm-roast/10 pt-2">
                      {sub.notes}
                    </p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Subscription">
        <SubscriptionForm
          onSuccess={() => {
            setShowCreate(false)
            startTransition(() => { load() })
          }}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Subscription">
        {editing && (
          <SubscriptionForm
            subscription={editing}
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

// ---------------------------------------------------------------------------
// SubscriptionForm — used for both create and edit
// ---------------------------------------------------------------------------

function SubscriptionForm({
  subscription,
  onSuccess,
}: {
  subscription?: Subscription
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const name = fd.get('name') as string
    const currency = fd.get('currency') as Currency
    const billing_period = fd.get('billing_period') as BillingPeriod
    const amount_cents = parseCentsInput(fd.get('amount') as string)
    const next_billing_date = (fd.get('next_billing_date') as string) || null
    const notes = (fd.get('notes') as string) || null

    if (!name) return setError('Name is required')
    if (!amount_cents) return setError('Enter a valid amount')

    const payload = {
      name,
      amount_cents,
      currency,
      billing_period,
      next_billing_date,
      notes,
    }

    startTransition(async () => {
      const result = subscription
        ? await updateSubscription(subscription.id, payload)
        : await createSubscription(payload)
      if (!result.success) return setError(result.error)
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Name"
        name="name"
        required
        placeholder="e.g. Netflix"
        defaultValue={subscription?.name}
      />
      <Input
        label="Amount"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        placeholder="0.00"
        defaultValue={subscription ? (subscription.amount_cents / 100).toFixed(2) : undefined}
      />
      <Select
        label="Currency"
        name="currency"
        options={CURRENCY_OPTIONS}
        defaultValue={subscription?.currency ?? 'USD'}
      />
      <Select
        label="Billing Period"
        name="billing_period"
        options={BILLING_PERIOD_OPTIONS}
        defaultValue={subscription?.billing_period ?? 'monthly'}
      />
      <Input
        label="Next Billing Date (optional)"
        name="next_billing_date"
        type="date"
        defaultValue={subscription?.next_billing_date ?? undefined}
      />
      <Input
        label="Notes (optional)"
        name="notes"
        placeholder="Any notes about this subscription"
        defaultValue={subscription?.notes ?? undefined}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">
        {subscription ? 'Save Changes' : 'Add Subscription'}
      </Button>
    </form>
  )
}
