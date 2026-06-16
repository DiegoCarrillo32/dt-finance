'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { getAccountsWithBalances, createAccount, updateAccount, deleteAccount } from '@/lib/actions/accounts'
import { formatCurrency } from '@/lib/utils'
import type { Account, Currency } from '@/lib/types'
import { Wallet } from 'lucide-react'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<(Account & { balance_cents: number })[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [pending, startTransition] = useTransition()

  async function load() {
    const data = await getAccountsWithBalances()
    setAccounts(data as (Account & { balance_cents: number })[])
  }

  useEffect(() => {
    startTransition(() => { load() })
  }, [])

  function handleDelete(id: string) {
    if (!confirm('Delete this account? This will fail if there are transactions linked to it.')) return
    startTransition(async () => {
      await deleteAccount(id)
      load()
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-heading text-3xl text-expresso">Accounts</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Account</span>
        </Button>
      </div>

      {pending && accounts.length === 0 ? (
        <SkeletonCards count={3} />
      ) : accounts.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No accounts yet. Add one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <Card key={a.id} className="flex items-center gap-4">
              <div className="p-2 bg-warm-roast/10 rounded-xl">
                <Wallet className="h-5 w-5 text-warm-roast" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-expresso">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.currency}</p>
              </div>
              <p className={`font-bold ${a.balance_cents >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(Math.abs(a.balance_cents), a.currency)}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(a)}
                  className="p-1.5 rounded-lg hover:bg-warm-roast/10 text-muted-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Account">
        <AccountForm
          onSuccess={() => {
            setShowCreate(false)
            startTransition(() => { load() })
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Account">
        {editing && (
          <AccountForm
            account={editing}
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

function AccountForm({
  account,
  onSuccess,
}: {
  account?: Account
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = fd.get('name') as string
    const currency = fd.get('currency') as Currency

    if (!name.trim()) return setError('Enter an account name')

    startTransition(async () => {
      const result = account
        ? await updateAccount(account.id, name, currency)
        : await createAccount(name, currency)

      if (!result.success) return setError(result.error)
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Account Name"
        name="name"
        placeholder="e.g. BCR Checking, Cash"
        defaultValue={account?.name ?? ''}
        required
      />
      <Select
        label="Currency"
        name="currency"
        defaultValue={account?.currency ?? 'USD'}
        options={[
          { value: 'USD', label: 'USD — US Dollar' },
          { value: 'CRC', label: 'CRC — Costa Rican Colón' },
        ]}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">
        {account ? 'Update' : 'Create'} Account
      </Button>
    </form>
  )
}
