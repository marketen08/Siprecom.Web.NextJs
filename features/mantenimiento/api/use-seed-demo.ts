import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface SeedDemoStatus {
  demoSeeded: boolean
}

export interface SeedDemoResultado {
  aplicado: boolean
  message?: string
  error?: string
}

export function useSeedDemoStatus() {
  return useQuery({
    queryKey: ["mantenimiento", "seed-demo"],
    queryFn: () => apiClient.get<SeedDemoStatus>("/api/mantenimiento/seed-demo"),
  })
}

export function useRunSeedDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ limpiarAntes }: { limpiarAntes: boolean }) =>
      apiClient.post<SeedDemoResultado>(
        `/api/mantenimiento/seed-demo${limpiarAntes ? "?limpiarAntes=true" : ""}`,
        {},
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mantenimiento", "seed-demo"] }),
  })
}
