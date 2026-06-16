'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/hooks/useTheme'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  function cycle() {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'dark' ? 'Dark mode' : theme === 'light' ? 'Light mode' : 'System theme'

  return (
    <button
      onClick={cycle}
      aria-label={`Current: ${label}. Click to cycle theme.`}
      title={label}
      className={cn(
        'p-2 rounded-lg hover:bg-warm-roast/10 text-muted-foreground transition-colors',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
