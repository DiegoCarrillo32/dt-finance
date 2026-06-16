import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-expresso/70">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full rounded-lg border border-warm-roast/20 bg-card px-3 py-2 text-sm text-foreground focus:border-coffee-fruit focus:outline-none focus:ring-1 focus:ring-coffee-fruit disabled:opacity-50',
          error && 'border-red-500',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
