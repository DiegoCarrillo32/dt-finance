'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { IconButton } from '@/components/ui/IconButton'
import {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  makeDebtPayment,
} from '@/lib/actions/debts'
import { formatCurrency, parseCentsInput, getDayOfMonthSuffix } from '@/lib/utils'
import { queryKeys, queryKeyPrefix } from '@/lib/queryKeys'
import type { Currency, Debt, DebtType } from '@/lib/types'

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  mortgage: 'Mortgage',
  student_loan: 'Student Loan',
  other: 'Other',
}

const DEBT_TYPE_OPTIONS = (Object.keys(DEBT_TYPE_LABELS) as DebtType[]).map((k) => ({
  value: k,
  label: DEBT_TYPE_LABELS[k],
}))

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'CRC', label: 'CRC' },
]

export default function DebtTrackerPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [paying, setPaying] = useState<Debt | null>(null)
  const [, startTransition] = useTransition()

  const { data: debts = [], isPending } = useQuery({
    queryKey: queryKeys.debts,
    queryFn: () => getDebts() as Promise<Debt[]>,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeyPrefix.debts })
    queryClient.invalidateQueries({ queryKey: queryKeyPrefix.netWorth })
  }

  const totalDebtCents = debts.reduce((sum, d) => sum + d.current_balance_cents, 0)
  const totalOriginalCents = debts.reduce((sum, d) => sum + d.original_amount_cents, 0)
  const totalPaidCents = totalOriginalCents - totalDebtCents

  function handleDelete(debt: Debt) {
    if (!confirm('Delete this item?')) return
    startTransition(async () => {
      await deleteDebt(debt.id)
      invalidate()
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl text-expresso">Debt Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total outstanding: {formatCurrency(totalDebtCents, 'USD')}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Debt</span>
        </Button>
      </div>

      {/* Summary card */}
      {(debts.length > 0 || !isPending) && (
        <Card className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Debt</p>
            <p className="font-bold text-red-500 text-lg">{formatCurrency(totalDebtCents, 'USD')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Paid Off</p>
            <p className="font-bold text-green-600 text-lg">{formatCurrency(totalPaidCents < 0 ? 0 : totalPaidCents, 'USD')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Debts</p>
            <p className="font-bold text-expresso text-lg">{debts.length}</p>
          </div>
        </Card>
      )}

      {isPending ? (
        <SkeletonCards count={3} />
      ) : debts.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            No debts tracked. Add your first debt to start tracking payoff progress.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => {
            const paidCents = debt.original_amount_cents - debt.current_balance_cents
            const pct = debt.original_amount_cents > 0
              ? Math.min(Math.round((paidCents / debt.original_amount_cents) * 100), 100)
              : 0

            return (
              <Card key={debt.id} className="space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CreditCard className="h-4 w-4 shrink-0 text-warm-roast" />
                    <div className="min-w-0">
                      <h3 className="font-bold text-expresso truncate">{debt.name}</h3>
                      {debt.creditor && (
                        <p className="text-xs text-muted-foreground">{debt.creditor}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="default">{DEBT_TYPE_LABELS[debt.type]}</Badge>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-warm-roast">{pct}% paid off</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(debt.current_balance_cents, debt.currency)} remaining
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warm-roast rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Original: {formatCurrency(debt.original_amount_cents, debt.currency)}
                  </p>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Interest Rate</p>
                    <p className="font-medium text-foreground">
                      {(debt.interest_rate_bps / 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Min. Payment</p>
                    <p className="font-medium text-foreground">
                      {formatCurrency(debt.minimum_payment_cents, debt.currency)}
                    </p>
                  </div>
                  {debt.due_day_of_month != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Due Day</p>
                      <p className="font-medium text-foreground">
                        {getDayOfMonthSuffix(debt.due_day_of_month)} of month
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPaying(debt)}
                  >
                    Pay
                  </Button>
                  <div className="flex items-center gap-1">
                    <IconButton
                      variant="default"
                      aria-label="Edit debt"
                      onClick={() => setEditing(debt)}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      variant="danger"
                      aria-label="Delete debt"
                      onClick={() => handleDelete(debt)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Debt">
        <DebtForm
          onSuccess={() => {
            setShowCreate(false)
            invalidate()
          }}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Debt">
        {editing && (
          <DebtForm
            debt={editing}
            onSuccess={() => {
              setEditing(null)
              invalidate()
            }}
          />
        )}
      </Modal>

      {/* Payment modal */}
      <Modal open={!!paying} onClose={() => setPaying(null)} title="Make a Payment">
        {paying && (
          <PaymentForm
            debt={paying}
            onSuccess={() => {
              setPaying(null)
              invalidate()
            }}
          />
        )}
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DebtForm — used for both create and edit
// ---------------------------------------------------------------------------

function DebtForm({
  debt,
  onSuccess,
}: {
  debt?: Debt
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const name = fd.get('name') as string
    const type = fd.get('type') as DebtType
    const creditor = (fd.get('creditor') as string) || null
    const currency = fd.get('currency') as Currency
    const originalCents = parseCentsInput(fd.get('original_amount') as string)
    const currentCents = parseCentsInput(fd.get('current_balance') as string)
    const interestRateRaw = parseFloat(fd.get('interest_rate') as string)
    const minimumCents = parseCentsInput(fd.get('minimum_payment') as string)
    const dueDayRaw = (fd.get('due_day') as string).trim()
    const dueDayOfMonth = dueDayRaw ? parseInt(dueDayRaw, 10) : null

    if (!name) return setError('Name is required')
    if (originalCents <= 0) return setError('Enter a valid original amount')
    if (currentCents < 0) return setError('Current balance cannot be negative')
    if (isNaN(interestRateRaw) || interestRateRaw < 0) return setError('Enter a valid interest rate')

    const interest_rate_bps = Math.round(interestRateRaw * 100)

    const payload = {
      name,
      type,
      creditor,
      currency,
      original_amount_cents: originalCents,
      current_balance_cents: currentCents,
      interest_rate_bps,
      minimum_payment_cents: minimumCents,
      due_day_of_month: dueDayOfMonth,
    }

    startTransition(async () => {
      const result = debt
        ? await updateDebt(debt.id, payload)
        : await createDebt(payload)
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
        placeholder="e.g. Chase Sapphire"
        defaultValue={debt?.name}
      />
      <Select
        label="Type"
        name="type"
        options={DEBT_TYPE_OPTIONS}
        defaultValue={debt?.type ?? 'credit_card'}
      />
      <Input
        label="Creditor (optional)"
        name="creditor"
        placeholder="e.g. Chase Bank"
        defaultValue={debt?.creditor ?? ''}
      />
      <Select
        label="Currency"
        name="currency"
        options={CURRENCY_OPTIONS}
        defaultValue={debt?.currency ?? 'USD'}
      />
      <Input
        label="Original Amount"
        name="original_amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        placeholder="0.00"
        defaultValue={debt ? (debt.original_amount_cents / 100).toFixed(2) : undefined}
      />
      <Input
        label="Current Balance"
        name="current_balance"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="0.00"
        defaultValue={debt ? (debt.current_balance_cents / 100).toFixed(2) : undefined}
      />
      <Input
        label="Interest Rate (%)"
        name="interest_rate"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="e.g. 15.5"
        defaultValue={debt ? (debt.interest_rate_bps / 100).toFixed(2) : undefined}
      />
      <Input
        label="Minimum Payment"
        name="minimum_payment"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="0.00"
        defaultValue={debt ? (debt.minimum_payment_cents / 100).toFixed(2) : undefined}
      />
      <Input
        label="Due Day of Month (optional)"
        name="due_day"
        type="number"
        min="1"
        max="31"
        placeholder="e.g. 15"
        defaultValue={debt?.due_day_of_month ?? undefined}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">
        {debt ? 'Save Changes' : 'Add Debt'}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// PaymentForm
// ---------------------------------------------------------------------------

function PaymentForm({
  debt,
  onSuccess,
}: {
  debt: Debt
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const amountCents = parseCentsInput(fd.get('amount') as string)
    if (!amountCents) return setError('Enter a valid amount')

    startTransition(async () => {
      const result = await makeDebtPayment(debt.id, amountCents)
      if (!result.success) return setError(result.error)
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Payment toward <strong>{debt.name}</strong>
      </p>
      <p className="text-sm">
        Current balance:{' '}
        <span className="font-bold text-red-500">
          {formatCurrency(debt.current_balance_cents, debt.currency)}
        </span>
      </p>
      <Input
        label="Payment Amount"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        placeholder="0.00"
        defaultValue={(debt.minimum_payment_cents / 100).toFixed(2)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">
        Confirm Payment
      </Button>
    </form>
  )
}
