import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/** Pone (revisada = true) o saca el tilde de revisión de una planilla. */
export function useMarcarRevision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, revisada }: { id: string; revisada: boolean }) =>
      revisada
        ? apiClient.post(`/api/planillas/${id}/revision`, {})
        : apiClient.delete(`/api/planillas/${id}/revision`),
    // El listado, el contador y el detalle cuelgan todos de ["planillas"].
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planillas"] }),
  })
}
