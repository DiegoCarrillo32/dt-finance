'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { getAccountsWithBalances, createAccount, updateAccount, deleteAccount } from '@/lib/actions/accounts'
import { formatCurrency } from '@/lib/utils'
import { queryKeys, queryKeyPrefix } from '@/lib/queryKeys'
import type { Account, Currency } from '@/lib/types'
import { Wallet } from 'lucide-react'

export default function AccountsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [, startTransition] = useTransition()

  const { data: accounts = [], isPending } = useQuery({
    queryKey: queryKeys.accountsWithBalances,
    queryFn: () =>
      getAccountsWithBalances() as Promise<(Account & { balance_cents: number })[]>,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeyPrefix.accounts })
    queryClient.invalidateQueries({ queryKey: queryKeyPrefix.netWorth })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this account? This will fail if there are transactions linked to it.')) return
    startTransition(async () => {
      await deleteAccount(id)
      invalidate()
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

      {isPending ? (
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
                <IconButton onClick={() => setEditing(a)} title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton variant="danger" onClick={() => handleDelete(a.id)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Account">
        <AccountForm
          onSuccess={() => {
            setShowCreate(false)
            invalidate()
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Account">
        {editing && (
          <AccountForm
            account={editing}
            onSuccess={() => {
              setEditing(null)
              invalidate()
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
