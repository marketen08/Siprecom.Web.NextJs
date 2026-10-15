"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // No reintentar cuando la sesión murió (401 = token expirado o
            // sesión reemplazada en otro dispositivo; 403 = sin permisos).
            // Reintentar redispara el mismo redirect a /login N veces y
            // contribuye al loop de "recarga infinita".
            retry: (failureCount, error: unknown) => {
              const status = (error as { status?: number } | null)?.status
              if (status === 401 || status === 403) return false
              return failureCount < 1
            },
            staleTime: 1000 * 60 * 5,
          },
          mutations: { retry: 0 },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
