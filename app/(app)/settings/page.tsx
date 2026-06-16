'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Trash2, Pencil, Download, LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { SkeletonLines } from '@/components/ui/Skeleton'
import { useTheme, type Theme } from '@/lib/hooks/useTheme'
import { cn } from '@/lib/utils'
import { getBudgetLimits, setBudgetLimit, deleteBudgetLimit, copyLastMonthBudgets } from '@/lib/actions/budgets'
import { getIncomeSources, createIncomeSource, updateIncomeSource, deleteIncomeSource } from '@/lib/actions/income'
import { getCategories, createCategory, deleteCategory } from '@/lib/actions/categories'
import { setExchangeRate, getRecentRates } from '@/lib/actions/exchange-rates'
import { exportTransactionsCsv } from '@/lib/actions/transactions'
import { formatCurrency, parseCentsInput, centsToDisplay } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Category, Currency, IncomeSource } from '@/lib/types'

export default function SettingsPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="font-heading text-3xl text-expresso">Settings</h1>

      <AppearanceSection />
      <MonthlyIncomeSection />
      <BudgetLimitsSection />
      <CategoriesSection />
      <ExchangeRatesSection />
      <ExportSection />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <Button variant="danger" onClick={handleSignOut} loading={pending}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </Card>
    </div>
  )
}

function MonthlyIncomeSection() {
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<IncomeSource | null>(null)
  const [pending, startTransition] = useTransition()

  async function load() {
    setSources(await getIncomeSources())
  }

  useEffect(() => { startTransition(() => { load() }) }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Monthly Income</CardTitle>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <p className="text-xs text-muted-foreground mb-3">
        Your expected salary each month. Used to show what&rsquo;s left after recurring expenses.
      </p>

      {pending && sources.length === 0 ? (
        <SkeletonLines count={2} />
      ) : sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">No income added yet.</p>
      ) : (
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(s.amount_cents, s.currency)} / month
                </p>
              </div>
              <IconButton onClick={() => setEditing(s)} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                variant="danger"
                title="Delete"
                onClick={() => startTransition(async () => { await deleteIncomeSource(s.id); load() })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Monthly Income">
        <IncomeForm onSuccess={() => { setShowForm(false); startTransition(() => { load() }) }} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Monthly Income">
        {editing && (
          <IncomeForm
            source={editing}
            onSuccess={() => { setEditing(null); startTransition(() => { load() }) }}
          />
        )}
      </Modal>
    </Card>
  )
}

function IncomeForm({ source, onSuccess }: { source?: IncomeSource; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()
    const amount = parseCentsInput(fd.get('amount') as string)
    const currency = fd.get('currency') as Currency
    if (!name) return setError('Enter a name')
    if (!amount) return setError('Enter a valid amount')
    startTransition(async () => {
      const result = source
        ? await updateIncomeSource(source.id, name, amount, currency)
        : await createIncomeSource(name, amount, currency)
      if (!result.success) return setError(result.error)
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Name" name="name" placeholder="e.g. Salary" defaultValue={source?.name ?? ''} required />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount / month"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={source ? centsToDisplay(source.amount_cents) : ''}
          required
        />
        <Select
          label="Currency"
          name="currency"
          defaultValue={source?.currency ?? 'USD'}
          options={[{ value: 'USD', label: 'USD' }, { value: 'CRC', label: 'CRC' }]}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">
        {source ? 'Update' : 'Add'} Income
      </Button>
    </form>
  )
}

function BudgetLimitsSection() {
  const [limits, setLimits] = useState<Awaited<ReturnType<typeof getBudgetLimits>>>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [pending, startTransition] = useTransition()

  async function load() {
    const [l, c] = await Promise.all([getBudgetLimits(), getCategories('expense')])
    setLimits(l)
    setCategories(c as Category[])
  }

  useEffect(() => { startTransition(() => { load() }) }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Budget Limits (This Month)</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => {
              startTransition(async () => {
                await copyLastMonthBudgets()
                load()
              })
            }}>Copy Last Month</Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {pending && limits.length === 0 ? (
        <SkeletonLines count={2} />
      ) : limits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budget limits set.</p>
      ) : (
        <ul className="space-y-2">
          {limits.map((l) => {
            const pct = l.spent_cents !== undefined && l.limit_cents > 0
              ? Math.round((l.spent_cents / l.limit_cents) * 100)
              : 0
            return (
              <li key={l.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <p className="text-sm font-medium">{(l.category as any)?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(l.spent_cents ?? 0, l.currency)} / {formatCurrency(l.limit_cents, l.currency)}
                  </p>
                </div>
                <Badge variant={pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success'}>
                  {pct}%
                </Badge>
                <IconButton
                  variant="danger"
                  title="Delete"
                  onClick={() => startTransition(async () => { await deleteBudgetLimit(l.id); load() })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Set Budget Limit">
        <BudgetForm
          categories={categories}
          onSuccess={() => { setShowAdd(false); startTransition(() => { load() }) }}
        />
      </Modal>
    </Card>
  )
}

function BudgetForm({ categories, onSuccess }: { categories: Category[]; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const categoryId = fd.get('category_id') as string
    const limit = parseCentsInput(fd.get('limit') as string)
    const currency = fd.get('currency') as Currency
    if (!limit) return setError('Enter a valid amount')
    startTransition(async () => {
      const result = await setBudgetLimit(categoryId, limit, currency)
      if (!result.success) return setError(result.error)
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select
        label="Category"
        name="category_id"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Select category"
        required
      />
      <Input label="Limit Amount" name="limit" type="number" step="0.01" min="0.01" placeholder="0.00" required />
      <Select
        label="Currency"
        name="currency"
        defaultValue="USD"
        options={[{ value: 'USD', label: 'USD' }, { value: 'CRC', label: 'CRC' }]}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">Set Limit</Button>
    </form>
  )
}

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [pending, startTransition] = useTransition()

  async function load() {
    const data = await getCategories()
    setCategories(data as Category[])
  }

  useEffect(() => { startTransition(() => { load() }) }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Categories</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      {pending && categories.length === 0 ? (
        <SkeletonLines count={4} />
      ) : (
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: c.color }}
            />
            <span className="text-sm flex-1">{c.name}</span>
            <Badge variant="muted">{c.type}</Badge>
            <IconButton
              variant="danger"
              title="Delete"
              onClick={() => {
                if (!confirm('Delete category? This may fail if transactions use it.')) return
                startTransition(async () => { await deleteCategory(c.id); load() })
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </li>
        ))}
      </ul>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Category">
        <CategoryForm onSuccess={() => { setShowAdd(false); startTransition(() => { load() }) }} />
      </Modal>
    </Card>
  )
}

function CategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createCategory(
        fd.get('name') as string,
        fd.get('type') as 'income' | 'expense',
        fd.get('color') as string,
        fd.get('icon') as string,
      )
      if (!result.success) return setError(result.error)
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Name" name="name" placeholder="e.g. Groceries" required />
      <Select
        label="Type"
        name="type"
        defaultValue="expense"
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
      />
      <Input label="Icon (lucide name)" name="icon" defaultValue="tag" placeholder="tag" />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-expresso/70">Color</label>
        <input name="color" type="color" defaultValue="#7a1318" className="h-9 w-16 rounded cursor-pointer" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">Create Category</Button>
    </form>
  )
}

function ExchangeRatesSection() {
  const [rates, setRates] = useState<Awaited<ReturnType<typeof getRecentRates>>>([])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  async function load() {
    const data = await getRecentRates(10)
    setRates(data)
  }

  useEffect(() => { startTransition(() => { load() }) }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const date = fd.get('date') as string
    const rate = parseFloat(fd.get('rate') as string)
    if (!date || isNaN(rate)) return setError('Fill in date and rate')
    startTransition(async () => {
      const result = await setExchangeRate(date, rate)
      if (!result.success) return setError(result.error)
      load()
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Exchange Rates (USD → CRC)</CardTitle></CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4 sm:flex-row">
        <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="flex-1" />
        <Input name="rate" type="number" step="0.0001" placeholder="510.0000" className="flex-1" />
        <Button type="submit" loading={pending} className="sm:w-auto">Set</Button>
      </form>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {pending && rates.length === 0 ? (
        <SkeletonLines count={3} />
      ) : (
        <ul className="space-y-1">
          {rates.map((r) => (
            <li key={r.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{r.date}</span>
              <span className="font-medium">₡{Number(r.usd_to_crc).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
      <div className="flex gap-3">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-colors',
              theme === value
                ? 'border-coffee-fruit bg-coffee-fruit/10 text-expresso'
                : 'border-warm-roast/20 text-muted-foreground hover:border-warm-roast/40 hover:text-expresso',
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

function ExportSection() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleExport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const start = fd.get('start') as string
    const end = fd.get('end') as string
    if (!start || !end) return setError('Select a date range')

    startTransition(async () => {
      const csv = await exportTransactionsCsv(start, end)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${start}-to-${end}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Export Transactions</CardTitle></CardHeader>
      <form onSubmit={handleExport} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" name="start" type="date" required />
          <Input label="End Date" name="end" type="date" required />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" variant="secondary" loading={pending} className="self-start">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </form>
    </Card>
  )
}
