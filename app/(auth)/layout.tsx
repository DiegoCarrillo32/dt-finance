import { Coffee } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-2 mb-8">
        <Coffee className="h-8 w-8 text-warm-roast" />
        <span className="font-heading text-2xl text-expresso">Dos Tazas Finance</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
