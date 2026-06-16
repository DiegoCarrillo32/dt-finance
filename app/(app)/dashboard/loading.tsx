import { Card } from '@/components/ui/Card'
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-heading text-3xl text-expresso">Dashboard</h1>
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Month totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-0 overflow-hidden">
          <SkeletonRows count={3} />
        </Card>
        <Card className="p-0 overflow-hidden">
          <SkeletonRows count={3} />
        </Card>
      </div>
    </div>
  )
}
