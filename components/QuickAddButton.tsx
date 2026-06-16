'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/components/forms/TransactionForm'
import type { Account, Category } from '@/lib/types'

interface QuickAddButtonProps {
  accounts: Account[]
  categories: Category[]
}

export function QuickAddButton({ accounts, categories }: QuickAddButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 h-14 w-14 rounded-full bg-warm-roast hover:bg-coffee-fruit text-white shadow-lg flex items-center justify-center transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="New Transaction">
        <TransactionForm
          accounts={accounts}
          categories={categories}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  )
}
