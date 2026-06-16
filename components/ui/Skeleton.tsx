import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

/** A single pulsing placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-warm-roast/10', className)} aria-hidden />
}

/** Spinning loader for inline / button-level feedback. */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn('h-5 w-5 animate-spin text-warm-roast', className)}
      role="status"
      aria-label="Loading"
    />
  )
}

/** Standalone skeleton cards — matches list pages that render one Card per item. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0" />
        </Card>
      ))}
    </div>
  )
}

/** A short stack of placeholder lines — for small lists inside a Card. */
export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  )
}

/** Skeleton rows for pages that render a single Card with a divided list inside. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <ul className="divide-y divide-warm-roast/10" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  )
}
