import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
        {
          'bg-warm-roast/10 text-warm-roast': variant === 'default',
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':
            variant === 'success',
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400':
            variant === 'warning',
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': variant === 'danger',
          'bg-muted text-muted-foreground': variant === 'muted',
        },
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
