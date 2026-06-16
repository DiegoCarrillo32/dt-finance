import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getTransaction } from '@/lib/actions/transactions'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TransactionDetailPage({ params }: Props) {
  const { id } = await params
  const transaction = await getTransaction(id)
  if (!transaction) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cat = transaction.category as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acc = transaction.account as any

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/transactions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl text-expresso">Transaction</h1>
          <Badge variant={transaction.type === 'income' ? 'success' : 'danger'}>
            {transaction.type}
          </Badge>
        </div>

        <div className="text-3xl font-bold">
          <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-500'}>
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount_cents, transaction.currency)}
          </span>
        </div>

        <dl className="space-y-3">
          <Row label="Date" value={formatDate(transaction.date)} />
          <Row label="Category" value={cat?.name ?? '—'} />
          <Row label="Account" value={acc?.name ?? '—'} />
          {transaction.description && (
            <Row label="Description" value={transaction.description} />
          )}
        </dl>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
