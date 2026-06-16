'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createGoal, updateGoal } from '@/lib/actions/goals'
import { parseCentsInput, centsToDisplay } from '@/lib/utils'
import type { Currency, SavingGoal } from '@/lib/types'

interface GoalFormProps {
  goal?: SavingGoal
  onSuccess?: () => void
}

export function GoalForm({ goal, onSuccess }: GoalFormProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const [currency, setCurrency] = useState<Currency>(goal?.currency ?? 'USD')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const payload = {
      name: fd.get('name') as string,
      target_amount_cents: parseCentsInput(fd.get('target_amount') as string),
      currency,
      deadline: (fd.get('deadline') as string) || null,
    }

    if (!payload.target_amount_cents) return setError('Enter a valid target amount')
    if (!payload.name.trim()) return setError('Enter a goal name')

    startTransition(async () => {
      const result = goal
        ? await updateGoal(goal.id, payload)
        : await createGoal(payload)

      if (!result.success) return setError(result.error)
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Goal Name"
        name="name"
        placeholder="e.g. Emergency Fund, Vacation"
        defaultValue={goal?.name ?? ''}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Target Amount"
          name="target_amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={goal ? centsToDisplay(goal.target_amount_cents) : ''}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-expresso/70">Currency</label>
          <div className="flex rounded-lg border border-warm-roast/20 overflow-hidden">
            {(['USD', 'CRC'] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${
                  currency === c
                    ? 'bg-warm-roast text-white'
                    : 'text-muted-foreground hover:bg-warm-roast/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Input
        label="Deadline (optional)"
        name="deadline"
        type="date"
        defaultValue={goal?.deadline ?? ''}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button type="submit" loading={pending} className="w-full">
        {goal ? 'Update' : 'Create'} Goal
      </Button>
    </form>
  )
}
