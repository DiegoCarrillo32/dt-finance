'use client'

import { Coffee, WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-4">
      <Coffee className="h-16 w-16 text-warm-roast" />
      <div className="text-center">
        <h1 className="font-heading text-3xl text-expresso mb-2">You&apos;re Offline</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          No internet connection. Check your connection and try again.
        </p>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm">Offline</span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="bg-warm-roast hover:bg-coffee-fruit text-white rounded-full px-6 py-2 text-sm font-bold transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}
