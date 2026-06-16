'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { createTransaction, updateTransaction } from '@/lib/actions/transactions'
import { parseCentsInput, centsToDisplay } from '@/lib/utils'
import type { Account, Category, Currency, Transaction, TransactionType } from '@/lib/types'

interface TransactionFormProps {
  accounts: Account[]
  categories: Category[]
  transaction?: Transaction
  onSuccess?: () => void
}

export function TransactionForm({
  accounts,
  categories,
  transaction,
  onSuccess,
}: TransactionFormProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense')
  const [accountId, setAccountId] = useState<string>(
    transaction?.account_id ?? accounts[0]?.id ?? '',
  )

  const filteredCategories = categories.filter((c) => c.type === type)
  // An account holds a single currency, so the transaction's currency is
  // always the selected account's currency. This keeps balances exact.
  const currency: Currency = accounts.find((a) => a.id === accountId)?.currency ?? 'USD'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const payload = {
      account_id: accountId,
      category_id: fd.get('category_id') as string,
      type,
      amount_cents: parseCentsInput(fd.get('amount') as string),
      currency,
      description: fd.get('description') as string,
      date: fd.get('date') as string,
    }

    if (!payload.amount_cents) return setError('Enter a valid amount')
    if (!payload.account_id) return setError('Select an account')
    if (!payload.category_id) return setError('Select a category')

    startTransition(async () => {
      const result = transaction
        ? await updateTransaction(transaction.id, payload)
        : await createTransaction(payload)

      if (!result.success) return setError(result.error)
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="flex rounded-full border border-warm-roast/20 overflow-hidden self-start">
        {(['expense', 'income'] as TransactionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-4 py-1.5 text-sm font-bold capitalize transition-colors ${
              type === t ? 'bg-warm-roast text-white' : 'text-muted-foreground hover:bg-warm-roast/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <Input
          label="Amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={transaction ? centsToDisplay(transaction.amount_cents) : ''}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-expresso/70">Currency</label>
          <div className="h-9 px-4 flex items-center rounded-lg border border-warm-roast/20 bg-muted text-sm font-bold text-expresso">
            {currency}
          </div>
        </div>
      </div>

      <Select
        label="Category"
        name="category_id"
        defaultValue={transaction?.category_id ?? ''}
        options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
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
        Amounts are recorded in the account&rsquo;s currency ({currency}).
      </p>

      <Input
        label="Date"
        name="date"
        type="date"
        defaultValue={transaction?.date ?? new Date().toISOString().split('T')[0]}
        required
      />

      <Input
        label="Description"
        name="description"
        placeholder="What was this for?"
        defaultValue={transaction?.description ?? ''}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button type="submit" loading={pending} className="w-full">
        {transaction ? 'Update' : 'Add'} Transaction
      </Button>
    </form>
  )
}
