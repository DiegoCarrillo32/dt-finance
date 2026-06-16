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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-expresso/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-md bg-card rounded-2xl shadow-lg border border-warm-roast/10 p-6',
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg text-expresso">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-warm-roast/10 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
