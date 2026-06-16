import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Currency } from '@/lib/types'

// Canonical money math lives in lib/finance.ts (pure + unit-tested).
// Re-exported here so existing `from '@/lib/utils'` imports keep working.
export { convertCurrency } from '@/lib/finance'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amountCents: number, currency: Currency): string {
  const amount = amountCents / 100
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function parseCentsInput(value: string): number {
  const num = parseFloat(value.replace(/,/g, ''))
  if (isNaN(num) || num <= 0) return 0
  return Math.round(num * 100)
}

export function centsToDisplay(amountCents: number): string {
  return (amountCents / 100).toFixed(2)
}

export function getFirstDayOfMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getDayOfMonthSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`
  switch (day % 10) {
    case 1: return `${day}st`
    case 2: return `${day}nd`
    case 3: return `${day}rd`
    default: return `${day}th`
  }
}
