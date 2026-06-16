'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { createRecurring, updateRecurring } from '@/lib/actions/recurring'
import { parseCentsInput, centsToDisplay } from '@/lib/utils'
import type { Account, Category, Currency, RecurringExpense } from '@/lib/types'

interface RecurringFormProps {
  accounts: Account[]
  categories: Category[]
  recurring?: RecurringExpense
  onSuccess?: () => void
}

export function RecurringForm({ accounts, categories, recurring, onSuccess }: RecurringFormProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const [accountId, setAccountId] = useState<string>(
    recurring?.account_id ?? accounts[0]?.id ?? '',
  )

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  // Currency follows the chosen account so the charge matches the account it hits.
  const currency: Currency = accounts.find((a) => a.id === accountId)?.currency ?? 'USD'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const endDate = (fd.get('end_date') as string) || null
    const payload = {
      name: fd.get('name') as string,
      account_id: accountId,
      category_id: fd.get('category_id') as string,
      amount_cents: parseCentsInput(fd.get('amount') as string),
      currency,
      day_of_month: parseInt(fd.get('day_of_month') as string, 10),
      frequency_months: parseInt(fd.get('frequency_months') as string, 10),
      end_date: endDate,
    }

    if (!payload.account_id) return setError('Select an account')

    if (!payload.amount_cents) return setError('Enter a valid amount')
    if (!payload.name.trim()) return setError('Enter a name')

    startTransition(async () => {
      const result = recurring
        ? await updateRecurring(recurring.id, payload)
        : await createRecurring(payload)

      if (!result.success) return setError(result.error)
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Name"
        name="name"
        placeholder="e.g. Netflix, Rent"
        defaultValue={recurring?.name ?? ''}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={recurring ? centsToDisplay(recurring.amount_cents) : ''}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-expresso/70">Currency</label>
          <div className="h-9 px-4 flex items-center rounded-lg border border-warm-roast/20 bg-muted text-sm font-bold text-expresso">
            {currency}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Day of Month"
          name="day_of_month"
          type="number"
          min="1"
          max="28"
          defaultValue={recurring?.day_of_month ?? 1}
          required
        />
        <Select
          label="Frequency"
          name="frequency_months"
          defaultValue={String(recurring?.frequency_months ?? 1)}
          options={[
            { value: '1', label: 'Every month' },
            { value: '3', label: 'Every 3 months' },
            { value: '6', label: 'Every 6 months' },
            { value: '12', label: 'Every year' },
          ]}
        />
      </div>

      <Input
        label="End Date (optional)"
        name="end_date"
        type="date"
        defaultValue={recurring?.end_date ?? ''}
      />

      <Select
        label="Category"
        name="category_id"
        defaultValue={recurring?.category_id ?? ''}
        options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Select category"
        required
      />

      <Select
        label="Account"
        name="account_id"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
        placeholder="Select account"
        required
      />
      <p className="-mt-2 text-xs text-muted-foreground">
        Charged in the account&rsquo;s currency ({currency}).
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button type="submit" loading={pending} className="w-full">
        {recurring ? 'Update' : 'Add'} Recurring Expense
      </Button>
    </form>
  )
}
