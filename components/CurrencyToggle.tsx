'use client'

import { cn } from '@/lib/utils'
import type { Currency } from '@/lib/types'

interface CurrencyToggleProps {
  value: Currency
  onChange: (c: Currency) => void
  className?: string
}

export function CurrencyToggle({ value, onChange, className }: CurrencyToggleProps) {
  return (
    <div className={cn('flex rounded-full border border-warm-roast/20 overflow-hidden', className)}>
      {(['USD', 'CRC'] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            'px-3 py-1 text-xs font-bold transition-colors',
            value === c
              ? 'bg-warm-roast text-white'
              : 'text-muted-foreground hover:bg-warm-roast/10',
          )}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
