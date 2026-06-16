'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCw,
  Target,
  BarChart2,
  Wallet,
  Settings,
  Coffee,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/statistics', label: 'Statistics', icon: BarChart2 },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-card border-r border-warm-roast/10 p-4 gap-2">
        <div className="flex items-center gap-2 px-2 py-4 mb-2">
          <Coffee className="h-6 w-6 text-warm-roast" />
          <span className="font-heading text-lg text-expresso">DT Finance</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-warm-roast/10 text-warm-roast font-bold'
                  : 'text-expresso/60 hover:bg-warm-roast/5 hover:text-expresso',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <ThemeToggle className="self-start" />
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-warm-roast/10 flex justify-around py-2">
        {nav.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors',
              pathname.startsWith(href)
                ? 'text-warm-roast font-bold'
                : 'text-expresso/50',
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="hidden xs:block">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
