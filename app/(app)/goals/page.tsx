'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { GoalForm } from '@/components/forms/GoalForm'
import { getSavingGoals, addGoalContribution, updateGoalStatus } from '@/lib/actions/goals'
import { formatCurrency, formatDate, parseCentsInput } from '@/lib/utils'
import { queryKeys, queryKeyPrefix } from '@/lib/queryKeys'
import type { Currency, SavingGoal } from '@/lib/types'

export default function GoalsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [contributing, setContributing] = useState<SavingGoal | null>(null)
  const [, startTransition] = useTransition()

  const { data: goals = [], isPending } = useQuery({
    queryKey: queryKeys.goals(),
    queryFn: () => getSavingGoals() as Promise<SavingGoal[]>,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeyPrefix.goals })
    queryClient.invalidateQueries({ queryKey: queryKeyPrefix.netWorth })
  }

  function projectCompletion(goal: SavingGoal): string | null {
    if (goal.current_amount_cents === 0) return null
    const monthly = goal.current_amount_cents / 3
    const remaining = goal.target_amount_cents - goal.current_amount_cents
    if (remaining <= 0) return 'Complete'
    const months = Math.ceil(remaining / monthly)
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-heading text-3xl text-expresso">Saving Goals</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Goal</span>
        </Button>
      </div>

      {isPending ? (
        <SkeletonCards count={3} />
      ) : goals.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No goals yet. Create your first one!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = Math.min(
              Math.round((g.current_amount_cents / g.target_amount_cents) * 100),
              100,
            )
            const projection = projectCompletion(g)

            return (
              <Card key={g.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-expresso">{g.name}</h3>
                    {g.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Deadline: {formatDate(g.deadline)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        g.status === 'completed'
                          ? 'success'
                          : g.status === 'paused'
                          ? 'muted'
                          : 'default'
                      }
                    >
                      {g.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-warm-roast">{pct}%</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(g.current_amount_cents, g.currency)} /{' '}
                      {formatCurrency(g.target_amount_cents, g.currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warm-roast rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {projection && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Projected: {projection}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  {g.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setContributing(g)}
                    >
                      Add Contribution
                    </Button>
                  )}
                  {g.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        startTransition(async () => {
                          await updateGoalStatus(g.id, 'paused')
                          invalidate()
                        })
                      }}
                    >
                      Pause
                    </Button>
                  )}
                  {g.status === 'paused' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        startTransition(async () => {
                          await updateGoalStatus(g.id, 'active')
                          invalidate()
                        })
                      }}
                    >
                      Resume
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Saving Goal">
        <GoalForm
          onSuccess={() => {
            setShowCreate(false)
            invalidate()
          }}
        />
      </Modal>

      <Modal
        open={!!contributing}
        onClose={() => setContributing(null)}
        title="Add Contribution"
      >
        {contributing && (
          <ContributionForm
            goal={contributing}
            onSuccess={() => {
              setContributing(null)
              invalidate()
            }}
          />
        )}
      </Modal>
    </div>
  )
}

function ContributionForm({
  goal,
  onSuccess,
}: {
  goal: SavingGoal
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const amountCents = parseCentsInput(fd.get('amount') as string)
    if (!amountCents) return setError('Enter a valid amount')

    startTransition(async () => {
      const result = await addGoalContribution(
        goal.id,
        amountCents,
        goal.currency,
        fd.get('date') as string,
        (fd.get('note') as string) || undefined,
      )
      if (!result.success) return setError(result.error)
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Contributing to <strong>{goal.name}</strong> ({goal.currency})
      </p>
      <Input
        label="Amount"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        required
      />
      <Input
        label="Date"
        name="date"
        type="date"
        defaultValue={new Date().toISOString().split('T')[0]}
        required
      />
      <Input label="Note (optional)" name="note" placeholder="What's this for?" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">
        Add Contribution
      </Button>
    </form>
  )
}
