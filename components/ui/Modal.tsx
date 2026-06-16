'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="fixed inset-0 bg-expresso/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          // Bottom sheet on mobile, centered card on desktop. Cap the height and
          // scroll the body so tall forms stay reachable with the keyboard open.
          'relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl border border-warm-roast/10 bg-card shadow-lg sm:rounded-2xl',
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-warm-roast/10 px-6 py-4">
            <h2 className="font-heading text-lg text-expresso">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-warm-roast/10 hover:text-expresso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}
