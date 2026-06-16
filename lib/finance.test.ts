import { describe, it, expect } from 'vitest'
import {
  convertCurrency,
  computeAccountBalances,
  sumConvertedToCurrency,
  spentByCategoryConverted,
  isDueInMonth,
  hasEnded,
  sumMonthlyRecurring,
  sumMonthlyIncome,
  type BalanceTxn,
} from './finance'

// Fixed rate of 500 colones per dollar keeps the math easy to eyeball:
// $1.00 (100 cents) === ₡500.00 (50000 céntimos).
const RATE = 500
const rate = () => RATE

describe('convertCurrency', () => {
  it('returns the same amount when currencies match', () => {
    expect(convertCurrency(12345, 'USD', 'USD', RATE)).toBe(12345)
    expect(convertCurrency(12345, 'CRC', 'CRC', RATE)).toBe(12345)
  })

  it('converts USD → CRC by multiplying by the rate', () => {
    // $10.50 → ₡5,250.00
    expect(convertCurrency(1050, 'USD', 'CRC', RATE)).toBe(525000)
  })

  it('converts CRC → USD by dividing by the rate', () => {
    // ₡5,250.00 → $10.50
    expect(convertCurrency(525000, 'CRC', 'USD', RATE)).toBe(1050)
  })

  it('rounds to the nearest minor unit', () => {
    // ₡59,900.00 (5,990,000 céntimos) ÷ 500 = $119.80 → 11980 cents
    expect(convertCurrency(5990000, 'CRC', 'USD', RATE)).toBe(11980)
    // ₡333 ÷ 500 = 0.666 → rounds to 1 céntimo of a dollar
    expect(convertCurrency(333, 'CRC', 'USD', RATE)).toBe(1)
  })
})

describe('computeAccountBalances', () => {
  const accounts = [
    { id: 'usd-acct', currency: 'USD' as const },
    { id: 'crc-acct', currency: 'CRC' as const },
  ]

  it('sums same-currency transactions exactly (income adds, expense subtracts)', () => {
    const txns: BalanceTxn[] = [
      { account_id: 'usd-acct', type: 'income', amount_cents: 100000, currency: 'USD', date: '2026-06-01' },
      { account_id: 'usd-acct', type: 'expense', amount_cents: 30000, currency: 'USD', date: '2026-06-02' },
    ]
    expect(computeAccountBalances(accounts, txns, rate)['usd-acct']).toBe(70000) // $700.00
  })

  it('regression: a CRC expense on a USD account is converted, not summed raw', () => {
    // This is the exact bug that showed $60,950 instead of $1,050.
    // Account starts with $1,050 income; a ₡59,900 expense is mistakenly
    // recorded against the USD account. Raw summing would have given
    // 105000 - 5990000 = a huge negative number; converted it is small.
    const txns: BalanceTxn[] = [
      { account_id: 'usd-acct', type: 'income', amount_cents: 105000, currency: 'USD', date: '2026-06-01' },
      { account_id: 'usd-acct', type: 'expense', amount_cents: 5990000, currency: 'CRC', date: '2026-06-10' },
    ]
    // ₡59,900 ÷ 500 = $119.80 → 11980 cents. 105000 - 11980 = 93020 ($930.20)
    expect(computeAccountBalances(accounts, txns, rate)['usd-acct']).toBe(93020)
  })

  it('converts USD transactions landing on a CRC account', () => {
    const txns: BalanceTxn[] = [
      { account_id: 'crc-acct', type: 'income', amount_cents: 200000, currency: 'CRC', date: '2026-06-01' },
      { account_id: 'crc-acct', type: 'income', amount_cents: 1000, currency: 'USD', date: '2026-06-02' },
    ]
    // ₡2,000.00 + ($10.00 → ₡5,000.00) = ₡7,000.00 = 700000 céntimos
    expect(computeAccountBalances(accounts, txns, rate)['crc-acct']).toBe(700000)
  })

  it('initializes accounts with no transactions to zero', () => {
    const balances = computeAccountBalances(accounts, [], rate)
    expect(balances['usd-acct']).toBe(0)
    expect(balances['crc-acct']).toBe(0)
  })

  it('ignores transactions whose account no longer exists', () => {
    const txns: BalanceTxn[] = [
      { account_id: 'deleted', type: 'income', amount_cents: 999, currency: 'USD', date: '2026-06-01' },
    ]
    const balances = computeAccountBalances(accounts, txns, rate)
    expect(balances['usd-acct']).toBe(0)
    expect(balances).not.toHaveProperty('deleted')
  })
})

describe('sumConvertedToCurrency', () => {
  it('totals mixed-currency amounts into one currency', () => {
    const txns = [
      { amount_cents: 100000, currency: 'USD' as const, date: '2026-06-01' }, // $1,000
      { amount_cents: 250000, currency: 'CRC' as const, date: '2026-06-02' }, // ₡2,500 → $5.00
    ]
    // $1,000.00 + $5.00 = $1,005.00 → 100500 cents
    expect(sumConvertedToCurrency(txns, 'USD', rate)).toBe(100500)
  })

  it('returns 0 for an empty list', () => {
    expect(sumConvertedToCurrency([], 'USD', rate)).toBe(0)
  })
})

describe('isDueInMonth', () => {
  const monthly = { frequency_months: 1, start_date: null, end_date: null, created_at: '2026-01-10' }

  it('a monthly expense is due every month', () => {
    expect(isDueInMonth(monthly, 2026, 6)).toBe(true)
    expect(isDueInMonth(monthly, 2026, 7)).toBe(true)
  })

  it('a quarterly expense is due on its anchor month and every 3 months after', () => {
    // Dog food: ₡70,000 every 3 months, anchored to June.
    const quarterly = { frequency_months: 3, start_date: '2026-06-01', end_date: null, created_at: '2026-06-01' }
    expect(isDueInMonth(quarterly, 2026, 6)).toBe(true) // anchor
    expect(isDueInMonth(quarterly, 2026, 7)).toBe(false)
    expect(isDueInMonth(quarterly, 2026, 8)).toBe(false)
    expect(isDueInMonth(quarterly, 2026, 9)).toBe(true) // +3
    expect(isDueInMonth(quarterly, 2026, 12)).toBe(true) // +6
    expect(isDueInMonth(quarterly, 2027, 3)).toBe(true) // +9
  })

  it('is not due before its anchor month', () => {
    const quarterly = { frequency_months: 3, start_date: '2026-06-01', end_date: null, created_at: '2026-06-01' }
    expect(isDueInMonth(quarterly, 2026, 5)).toBe(false)
  })

  it('a debt with an end date stops being due after that month', () => {
    // $120 monthly until November 2026.
    const debt = { frequency_months: 1, start_date: null, end_date: '2026-11-30', created_at: '2026-06-01' }
    expect(isDueInMonth(debt, 2026, 11)).toBe(true) // last month
    expect(isDueInMonth(debt, 2026, 12)).toBe(false) // ended
    expect(isDueInMonth(debt, 2027, 1)).toBe(false)
  })
})

describe('sumMonthlyRecurring', () => {
  it('amortizes non-monthly items and converts to one currency', () => {
    const items = [
      { amount_cents: 8000000, currency: 'CRC' as const, frequency_months: 1 },  // ₡80,000/mo rent
      { amount_cents: 7000000, currency: 'CRC' as const, frequency_months: 3 },  // ₡70,000 every 3 mo → ₡23,333/mo
      { amount_cents: 55000, currency: 'USD' as const, frequency_months: 1 },    // $550/mo → ₡275,000
    ]
    // ₡80,000 + ₡23,333 + ₡275,000 = ₡378,333 = 37,833,333 céntimos (rounding per item)
    // item3: $550 → ₡275,000 = 27,500,000; /1 = 27,500,000
    // item2: ₡70,000=7,000,000; /3 = 2,333,333; item1: 8,000,000
    expect(sumMonthlyRecurring(items, 'CRC', RATE)).toBe(8000000 + 2333333 + 27500000)
  })

  it('returns 0 for no items', () => {
    expect(sumMonthlyRecurring([], 'USD', RATE)).toBe(0)
  })
})

describe('sumMonthlyIncome', () => {
  it('sums income sources converted to one currency', () => {
    const sources = [
      { amount_cents: 210000, currency: 'USD' as const },   // $2,100
      { amount_cents: 25000000, currency: 'CRC' as const },  // ₡250,000 → $500 at rate 500
    ]
    // $2,100 + $500 = $2,600 → 260000 cents
    expect(sumMonthlyIncome(sources, 'USD', RATE)).toBe(260000)
  })
})

describe('hasEnded', () => {
  it('is true only after the end_date month', () => {
    expect(hasEnded('2026-11-30', 2026, 11)).toBe(false)
    expect(hasEnded('2026-11-30', 2026, 12)).toBe(true)
    expect(hasEnded(null, 2030, 1)).toBe(false)
  })
})

describe('spentByCategoryConverted', () => {
  it('converts spend into each category target currency', () => {
    const txns = [
      { category_id: 'food', amount_cents: 50000, currency: 'USD' as const, date: '2026-06-01' },
      { category_id: 'food', amount_cents: 250000, currency: 'CRC' as const, date: '2026-06-02' },
      { category_id: 'rent', amount_cents: 1000000, currency: 'CRC' as const, date: '2026-06-03' },
    ]
    const target = (c: string) => (c === 'food' ? ('USD' as const) : ('CRC' as const))
    const spent = spentByCategoryConverted(txns, target, rate)
    // food in USD: $500.00 + (₡2,500 → $5.00) = $505.00
    expect(spent['food']).toBe(50500)
    // rent in CRC: ₡10,000.00 = 1,000,000 céntimos
    expect(spent['rent']).toBe(1000000)
  })

  it('skips categories with no target currency', () => {
    const txns = [
      { category_id: 'untracked', amount_cents: 50000, currency: 'USD' as const, date: '2026-06-01' },
    ]
    const spent = spentByCategoryConverted(txns, () => undefined, rate)
    expect(spent).toEqual({})
  })
})
