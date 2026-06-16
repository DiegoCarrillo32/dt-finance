import type { BillingPeriod, Currency, TransactionType } from '@/lib/types'

/**
 * Pure money math. No I/O, no framework — everything here is unit-tested in
 * lib/finance.test.ts. All amounts are integer minor units (US cents /
 * céntimos). Currency conversion uses a USD→CRC rate (colones per dollar).
 *
 * Rule of thumb: never add two amounts in different currencies. Convert both
 * to a single target currency first.
 */

/** Convert an integer minor-unit amount from one currency to another. */
export function convertCurrency(
  amountCents: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  usdToCrc: number,
): number {
  if (fromCurrency === toCurrency) return amountCents
  if (fromCurrency === 'USD' && toCurrency === 'CRC') {
    return Math.round(amountCents * usdToCrc)
  }
  // CRC → USD
  return Math.round(amountCents / usdToCrc)
}

/** A function that returns the USD→CRC rate that applied on a given date. */
export type RateForDate = (date: string) => number

export interface BalanceTxn {
  account_id: string
  type: TransactionType
  amount_cents: number
  currency: Currency
  date: string
}

/**
 * Compute each account's balance, expressed in that account's own currency.
 * Income adds, expense subtracts. Transactions recorded in a different
 * currency than their account are converted using the rate for their date.
 */
export function computeAccountBalances(
  accounts: { id: string; currency: Currency }[],
  txns: BalanceTxn[],
  rateForDate: RateForDate,
): Record<string, number> {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const balances: Record<string, number> = {}
  for (const a of accounts) balances[a.id] = 0

  for (const t of txns) {
    const target = currencyOf.get(t.account_id)
    if (!target) continue // orphan transaction; ignore
    const converted = convertCurrency(t.amount_cents, t.currency, target, rateForDate(t.date))
    balances[t.account_id] += t.type === 'income' ? converted : -converted
  }
  return balances
}

export interface AmountTxn {
  amount_cents: number
  currency: Currency
  date: string
}

/** Sum a list of amounts, each converted into a single target currency. */
export function sumConvertedToCurrency(
  txns: AmountTxn[],
  target: Currency,
  rateForDate: RateForDate,
): number {
  return txns.reduce(
    (sum, t) => sum + convertCurrency(t.amount_cents, t.currency, target, rateForDate(t.date)),
    0,
  )
}

export interface MonthlyRecurringItem {
  amount_cents: number
  currency: Currency
  frequency_months: number
}

/**
 * Total monthly commitment of a set of recurring expenses, converted to one
 * currency. Non-monthly items are amortized (e.g. a ₡70,000 charge every 3
 * months counts as ₡23,333/month) so the figure is a stable monthly average.
 * Caller should pass only the items currently in effect (active, not ended).
 */
export function sumMonthlyRecurring(
  items: MonthlyRecurringItem[],
  target: Currency,
  usdToCrc: number,
): number {
  return items.reduce((sum, r) => {
    const converted = convertCurrency(r.amount_cents, r.currency, target, usdToCrc)
    return sum + Math.round(converted / (r.frequency_months || 1))
  }, 0)
}

export interface MonthlyIncomeItem {
  amount_cents: number
  currency: Currency
}

/** Total expected monthly income, converted to one currency. */
export function sumMonthlyIncome(
  items: MonthlyIncomeItem[],
  target: Currency,
  usdToCrc: number,
): number {
  return items.reduce(
    (sum, i) => sum + convertCurrency(i.amount_cents, i.currency, target, usdToCrc),
    0,
  )
}

/** Convert a 'YYYY-MM-DD' or ISO timestamp string to a month ordinal (year*12 + monthIndex). */
function monthOrdinal(dateStr: string): number {
  const year = Number(dateStr.slice(0, 4))
  const month = Number(dateStr.slice(5, 7)) // 1-12
  return year * 12 + (month - 1)
}

export interface RecurrenceSchedule {
  /** 1 = monthly, 3 = quarterly, 6 = semiannual, 12 = yearly. */
  frequency_months: number
  /** Anchor month for non-monthly frequencies; falls back to created_at. */
  start_date: string | null
  /** Last month the expense applies; null = indefinite. */
  end_date: string | null
  created_at: string
}

/**
 * Whether a recurring expense applies in a given calendar month (month is 1-12).
 * Monthly expenses are due every month from their start; non-monthly ones are
 * due on the anchor month and every `frequency_months` after. Nothing is due
 * after its end_date's month.
 */
export function isDueInMonth(r: RecurrenceSchedule, year: number, month: number): boolean {
  const target = year * 12 + (month - 1)
  if (r.end_date && target > monthOrdinal(r.end_date)) return false
  const anchor = monthOrdinal(r.start_date ?? r.created_at)
  if (target < anchor) return false
  const freq = r.frequency_months || 1
  return (target - anchor) % freq === 0
}

/** Whether a recurring expense's end_date is strictly before the given month. */
export function hasEnded(endDate: string | null, year: number, month: number): boolean {
  if (!endDate) return false
  return year * 12 + (month - 1) > monthOrdinal(endDate)
}

/** Monthly cost equivalent for a subscription (in its own currency, in cents). */
export function monthlyEquivalent(amountCents: number, period: BillingPeriod): number {
  switch (period) {
    case 'weekly':    return Math.round(amountCents * 52 / 12)
    case 'monthly':   return amountCents
    case 'quarterly': return Math.round(amountCents / 3)
    case 'yearly':    return Math.round(amountCents / 12)
  }
}

/** Yearly cost equivalent for a subscription (in its own currency, in cents). */
export function yearlyEquivalent(amountCents: number, period: BillingPeriod): number {
  switch (period) {
    case 'weekly':    return Math.round(amountCents * 52)
    case 'monthly':   return amountCents * 12
    case 'quarterly': return amountCents * 4
    case 'yearly':    return amountCents
  }
}

export interface CategoryTxn extends AmountTxn {
  category_id: string
}

/**
 * Sum expense amounts per category, converting each transaction into the
 * target currency configured for that category (e.g. its budget's currency).
 * Categories without a target currency are skipped.
 */
export function spentByCategoryConverted(
  txns: CategoryTxn[],
  targetCurrencyOf: (categoryId: string) => Currency | undefined,
  rateForDate: RateForDate,
): Record<string, number> {
  const spent: Record<string, number> = {}
  for (const t of txns) {
    const target = targetCurrencyOf(t.category_id)
    if (!target) continue
    spent[t.category_id] =
      (spent[t.category_id] ?? 0) +
      convertCurrency(t.amount_cents, t.currency, target, rateForDate(t.date))
  }
  return spent
}
