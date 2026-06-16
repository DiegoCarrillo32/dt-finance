'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Pencil, Trash2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { TransactionForm } from '@/components/forms/TransactionForm'
import { getTransactions, softDeleteTransaction } from '@/lib/actions/transactions'
import { getAccounts } from '@/lib/actions/accounts'
import { getCategories } from '@/lib/actions/categories'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Account, Category, Transaction, TransactionType } from '@/lib/types'

const PAGE_SIZE = 20

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [pending, startTransition] = useTransition()

  // Filters
  const [type, setType] = useState<TransactionType | ''>('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = !!(type || accountId || categoryId || debouncedSearch)

  // Categories selectable for the current type filter.
  const filterCategories = useMemo(
    () => (type ? categories.filter((c) => c.type === type) : categories),
    [categories, type],
  )

  // Reference data only needs to load once.
  useEffect(() => {
    Promise.all([getAccounts(), getCategories()]).then(([accs, cats]) => {
      setAccounts(accs as Account[])
      setCategories(cats as Category[])
    })
  }, [])

  // Debounce the free-text search so we don't query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(id)
  }, [search])

  function loadList() {
    startTransition(async () => {
      const { data, count } = await getTransactions({
        page,
        pageSize: PAGE_SIZE,
        type: type || undefined,
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
        search: debouncedSearch || undefined,
      })
      setTransactions(data as Transaction[])
      setTotal(count)
    })
  }

  // Reload the list whenever the page or any filter changes.
  useEffect(() => {
    loadList()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, accountId, categoryId, debouncedSearch])

  // Any filter change resets to the first page.
  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  function clearFilters() {
    setType('')
    setAccountId('')
    setCategoryId('')
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    startTransition(async () => {
      await softDeleteTransaction(id)
      loadList()
    })
  }

  const selectClass =
    'rounded-lg border border-warm-roast/20 bg-card px-3 py-2 text-sm text-foreground focus:border-coffee-fruit focus:outline-none focus:ring-1 focus:ring-coffee-fruit'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-expresso">Transactions</h1>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? 'result' : 'results'}
          </span>
        )}
      </div>

      {/* Filters */}
      <Card className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            inputMode="search"
            value={search}
            onChange={(e) => changeFilter(setSearch, e.target.value)}
            placeholder="Search description…"
            aria-label="Search transactions"
            className="w-full rounded-lg border border-warm-roast/20 bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-coffee-fruit focus:outline-none focus:ring-1 focus:ring-coffee-fruit"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={type}
            onChange={(e) => {
              changeFilter(setType, e.target.value as TransactionType | '')
              // Drop a category that no longer matches the chosen type.
              setCategoryId('')
            }}
            aria-label="Filter by type"
            className={selectClass}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={accountId}
            onChange={(e) => changeFilter(setAccountId, e.target.value)}
            aria-label="Filter by account"
            className={selectClass}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => changeFilter(setCategoryId, e.target.value)}
            aria-label="Filter by category"
            className={selectClass}
          >
            <option value="">All categories</option>
            {filterCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {pending && transactions.length === 0 ? (
          <SkeletonRows count={6} />
        ) : transactions.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {hasFilters
              ? 'No transactions match these filters.'
              : 'No transactions yet. Use the + button to add one.'}
          </p>
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
                    <p className="text-xs text-muted-foreground truncate">
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
                    <IconButton onClick={() => setEditing(t)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton variant="danger" onClick={() => handleDelete(t.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
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
              loadList()
            }}
          />
        )}
      </Modal>
    </div>
  )
}
