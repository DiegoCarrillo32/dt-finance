export type Currency = 'USD' | 'CRC'
export type TransactionType = 'income' | 'expense'
export type GoalStatus = 'active' | 'completed' | 'paused'
export type CategoryType = 'income' | 'expense'

export interface Account {
  id: string
  user_id: string
  name: string
  currency: Currency
  created_at: string
  balance_cents?: number
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  color: string
  icon: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string
  type: TransactionType
  amount_cents: number
  currency: Currency
  description: string
  date: string
  deleted_at: string | null
  created_at: string
  account?: Account
  category?: Category
}

export interface RecurringExpense {
  id: string
  user_id: string
  account_id: string
  category_id: string
  name: string
  amount_cents: number
  currency: Currency
  day_of_month: number
  /** How often it recurs, in months. 1 = monthly, 3 = quarterly, 12 = yearly. */
  frequency_months: number
  /** Anchor month for non-monthly frequencies; null behaves as monthly. */
  start_date: string | null
  /** Last date the expense applies; null means indefinite. */
  end_date: string | null
  active: boolean
  created_at: string
  account?: Account
  category?: Category
}

export interface SavingGoal {
  id: string
  user_id: string
  name: string
  target_amount_cents: number
  currency: Currency
  current_amount_cents: number
  deadline: string | null
  status: GoalStatus
  created_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  transaction_id: string | null
  amount_cents: number
  currency: Currency
  date: string
  note: string | null
  created_at: string
}

export interface BudgetLimit {
  id: string
  user_id: string
  category_id: string
  month: string
  limit_cents: number
  currency: Currency
  created_at: string
  spent_cents?: number
  category?: Category
}

export interface IncomeSource {
  id: string
  user_id: string
  name: string
  /** Expected monthly income amount in minor units. */
  amount_cents: number
  currency: Currency
  created_at: string
}

export interface ExchangeRate {
  id: string
  date: string
  usd_to_crc: number
  created_at: string
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
