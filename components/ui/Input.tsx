import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-expresso/70">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full rounded-lg border border-warm-roast/20 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-coffee-fruit focus:outline-none focus:ring-1 focus:ring-coffee-fruit disabled:opacity-50',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
