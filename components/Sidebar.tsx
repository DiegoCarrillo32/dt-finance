'use client'

import { useEffect, useState } from 'react'
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
  MoreHorizontal,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

const dashboard = { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
const transactions = { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight }
const recurring = { href: '/recurring', label: 'Recurring', icon: RefreshCw }
const goals = { href: '/goals', label: 'Goals', icon: Target }
const statistics = { href: '/statistics', label: 'Statistics', icon: BarChart2 }
const accounts = { href: '/accounts', label: 'Accounts', icon: Wallet }
const settings = { href: '/settings', label: 'Settings', icon: Settings }

// Desktop sidebar shows everything.
const nav = [dashboard, transactions, recurring, goals, statistics, accounts, settings]

// On mobile, four primary tabs stay in the bottom bar; the rest live behind "More"
// so every destination — including Settings — is reachable with a comfortable tap target.
const mobilePrimary = [dashboard, transactions, statistics, goals]
const mobileMore = [recurring, accounts, settings]

export function Sidebar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  // Close the sheet whenever we navigate to a new route.
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  // Escape to close + lock background scroll while the sheet is open.
  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [moreOpen])

  const moreActive = mobileMore.some(({ href }) => pathname.startsWith(href))

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
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-warm-roast/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch">
          {mobilePrimary.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 min-h-[56px] px-1 py-2 text-[11px] font-medium leading-tight transition-colors',
                  active
                    ? 'text-warm-roast font-bold'
                    : 'text-expresso/60 active:bg-warm-roast/5',
                )}
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 min-h-[56px] px-1 py-2 text-[11px] font-medium leading-tight transition-colors',
              moreActive || moreOpen
                ? 'text-warm-roast font-bold'
                : 'text-expresso/60 active:bg-warm-roast/5',
            )}
          >
            <MoreHorizontal className="h-6 w-6 shrink-0" />
            <span className="max-w-full truncate">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" bottom sheet */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-50 transition-opacity duration-200',
          moreOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!moreOpen}
      >
        <div
          className="absolute inset-0 bg-expresso/40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
          className={cn(
            'absolute inset-x-0 bottom-0 bg-card rounded-t-2xl border-t border-warm-roast/10 shadow-lg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-transform duration-200',
            moreOpen ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-warm-roast/20" />

          <div className="flex items-center justify-between mb-2 px-1">
            <span className="font-heading text-lg text-expresso">More</span>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Close"
              className="p-2 rounded-full hover:bg-warm-roast/10 text-expresso/60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {mobileMore.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-colors',
                    active
                      ? 'bg-warm-roast/10 text-warm-roast font-bold'
                      : 'text-expresso/70 hover:bg-warm-roast/5 active:bg-warm-roast/10',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-2 pt-3 border-t border-warm-roast/10 flex items-center justify-between px-3">
            <span className="text-sm font-medium text-expresso/70">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  )
}
