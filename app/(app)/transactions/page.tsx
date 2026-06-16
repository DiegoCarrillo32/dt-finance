'use client'

import { useEffect, useState, useTransition } from 'react'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { TransactionForm } from '@/components/forms/TransactionForm'
import { getTransactions, softDeleteTransaction } from '@/lib/actions/transactions'
import { getAccounts } from '@/lib/actions/accounts'
import { getCategories } from '@/lib/actions/categories'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Account, Category, Transaction } from '@/lib/types'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [pending, startTransition] = useTransition()

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  async function load() {
    const [{ data, count }, accs, cats] = await Promise.all([
      getTransactions({ page, pageSize }),
      getAccounts(),
      getCategories(),
    ])
    setTransactions(data as Transaction[])
    setTotal(count)
    setAccounts(accs as Account[])
    setCategories(cats as Category[])
  }

  useEffect(() => {
    startTransition(() => { load() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    startTransition(async () => {
      await softDeleteTransaction(id)
      load()
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-expresso">Transactions</h1>
      </div>

      <Card className="p-0 overflow-hidden">
        {pending && transactions.length === 0 ? (
          <SkeletonRows count={6} />
        ) : transactions.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No transactions yet. Use the + button to add one.</p>
        ) : (
          <ul className="divide-y divide-warm-roast/10">
            {transactions.map((t) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cat = t.category as any
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const acc = t.account as any
              return (
                <li key={t.id} className="flex items-center gap-3 p-4 hover:bg-warm-roast/5">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: cat?.color ?? '#7a1318' }}
                  >
                    {cat?.name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.description || cat?.name || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.date)} · {acc?.name}
                    </p>
                  </div>
                  <span
                    className={`font-bold text-sm shrink-0 ${
                      t.type === 'income' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatCurrency(t.amount_cents, t.currency)}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(t)}
                      className="p-1.5 rounded-lg hover:bg-warm-roast/10 text-muted-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Transaction"
      >
        {editing && (
          <TransactionForm
            accounts={accounts}
            categories={categories}
            transaction={editing}
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
