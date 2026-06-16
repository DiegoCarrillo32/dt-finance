// Centralized React Query keys.
//
// Keys are shared by the *server action* they wrap, not by the page that uses
// them — so a piece of data fetched from two pages (e.g. subscriptions on both
// the Subscriptions page and the Calendar) lives in a single cache entry and
// is invalidated in one place. React Query matches keys by prefix, so
// invalidating ['recurring'] clears both ['recurring','status'] and
// ['recurring','list'].
import type { Currency, TransactionType } from '@/lib/types'

export interface TransactionsQueryArgs {
  page: number
  type?: TransactionType
  accountId?: string
  categoryId?: string
  search?: string
}

export const queryKeys = {
  accounts: ['accounts'] as const,
  accountsWithBalances: ['accounts', 'balances'] as const,
  categories: (type?: 'income' | 'expense') => ['categories', type ?? 'all'] as const,
  transactions: (args: TransactionsQueryArgs) => ['transactions', args] as const,
  debts: ['debts'] as const,
  goals: (status?: string) => ['goals', status ?? 'all'] as const,
  subscriptions: ['subscriptions'] as const,
  recurringStatus: ['recurring', 'status'] as const,
  recurringList: ['recurring', 'list'] as const,
  netWorth: ['net-worth'] as const,
  cashFlow: (months: number) => ['cash-flow', months] as const,
  statisticsMonthly: (year: number, month: number, currency: Currency) =>
    ['statistics', 'monthly', year, month, currency] as const,
  statisticsHistory: (currency: Currency) => ['statistics', 'history', currency] as const,
  monthlySummary: (currency: Currency) => ['income', 'summary', currency] as const,
  incomeSources: ['income', 'sources'] as const,
  budgets: ['budgets'] as const,
  recentRates: (limit: number) => ['exchange-rates', 'recent', limit] as const,
} as const

// Prefixes used for invalidation (each clears every key that starts with it).
export const queryKeyPrefix = {
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  transactions: ['transactions'] as const,
  debts: ['debts'] as const,
  goals: ['goals'] as const,
  subscriptions: ['subscriptions'] as const,
  recurring: ['recurring'] as const,
  netWorth: ['net-worth'] as const,
  cashFlow: ['cash-flow'] as const,
  statistics: ['statistics'] as const,
  income: ['income'] as const,
  budgets: ['budgets'] as const,
  exchangeRates: ['exchange-rates'] as const,
} as const
