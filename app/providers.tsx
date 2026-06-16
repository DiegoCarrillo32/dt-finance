'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session, kept stable across re-renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Most finance data rarely changes between visits, so treat it as
            // fresh for a while. Within this window, re-navigating to a page
            // shows cached data instantly with no refetch or skeleton.
            staleTime: 5 * 60 * 1000,
            // Keep unused data around so back-navigation stays instant.
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
