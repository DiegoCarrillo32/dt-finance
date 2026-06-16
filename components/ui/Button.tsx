import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-warm-roast hover:bg-coffee-fruit text-white rounded-full': variant === 'primary',
          'bg-muted text-foreground hover:bg-warm-roast/10 rounded-full': variant === 'secondary',
          'hover:bg-warm-roast/10 rounded-lg text-foreground': variant === 'ghost',
          'bg-red-600 hover:bg-red-700 text-white rounded-full': variant === 'danger',
        },
        {
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-5 py-2 text-sm': size === 'md',
          'px-7 py-3 text-base': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
