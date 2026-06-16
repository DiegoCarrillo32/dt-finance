'use client'

import { useState, useTransition } from 'react'
import { Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { getReportData } from '@/lib/actions/reports'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReportSummary, ReportTransaction } from '@/lib/actions/reports'

// ---------------------------------------------------------------------------
// Inline CSV builder (pure client-side — avoids importing a 'use server' fn)
// ---------------------------------------------------------------------------

function buildCsvString(transactions: ReportTransaction[]): string {
  const headers = ['Date', 'Type', 'Description', 'Amount', 'Currency', 'Account', 'Category']
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    `"${t.description.replace(/"/g, '""')}"`,
    (t.amount_cents / 100).toFixed(2),
    t.currency,
    `"${t.account_name.replace(/"/g, '""')}"`,
    `"${t.category_name.replace(/"/g, '""')}"`,
  ])
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function firstOfMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  const [report, setReport] = useState<ReportSummary | null>(null)
  const [generated, setGenerated] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      const result = await getReportData({ startDate, endDate, type })
      setReport(result)
      setGenerated(true)
    })
  }

  function handleExportCsv() {
    if (!report || report.transactions.length === 0) return
    const csvString = buildCsvString(report.transactions)
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const net = report
    ? report.total_income_cents - report.total_expense_cents
    : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-heading text-3xl text-expresso">Reports &amp; Export</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCsv}
          disabled={!report || report.transactions.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filter form */}
      <Card>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              id="start-date"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              id="end-date"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            <Select
              id="type"
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as 'all' | 'income' | 'expense')}
              options={[
                { value: 'all', label: 'All' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ]}
            />
          </div>
          <Button type="submit" loading={pending}>
            Generate Report
          </Button>
        </form>
      </Card>

      {/* Results */}
      {!generated && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Select a date range and generate a report to see your transactions.
          </p>
        </Card>
      )}

      {generated && report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="font-bold text-green-600">
                {formatCurrency(report.total_income_cents, 'USD')}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Total Expense</p>
              <p className="font-bold text-red-500">
                {formatCurrency(report.total_expense_cents, 'USD')}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Net</p>
              <p className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {net < 0 ? '-' : ''}
                {formatCurrency(Math.abs(net), 'USD')}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="font-bold text-expresso">{report.count}</p>
            </Card>
          </div>

          {/* Transaction list */}
          {report.transactions.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">
                No transactions found for the selected filters.
              </p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <ul className="divide-y divide-warm-roast/10">
                {report.transactions.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 p-4 hover:bg-warm-roast/5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-expresso truncate">
                          {t.description || t.category_name || '—'}
                        </p>
                        <Badge variant={t.type === 'income' ? 'success' : 'danger'}>
                          {t.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(t.date)} · {t.account_name} · {t.category_name}
                      </p>
                    </div>
                    <span
                      className={`font-bold text-sm shrink-0 ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatCurrency(t.amount_cents, t.currency as 'USD' | 'CRC')}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
