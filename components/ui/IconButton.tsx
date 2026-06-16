import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type IconButtonVariant = 'default' | 'danger' | 'success'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  /** Renders the success variant in its "on" state (e.g. a paid toggle). */
  active?: boolean
}

/**
 * Compact square button for in-row actions (edit, delete, toggle…).
 * Standardizes the repeated `p-1.5 rounded-lg hover:bg-…` pattern and gives
 * every action a comfortable ≥36px tap target for mobile.
 */
export function IconButton({
  variant = 'default',
  active,
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'hover:bg-warm-roast/10 hover:text-expresso',
        variant === 'danger' && 'hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30',
        variant === 'success' && 'hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30',
        active && variant === 'success' && 'bg-green-100 text-green-600 dark:bg-green-900/30',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
