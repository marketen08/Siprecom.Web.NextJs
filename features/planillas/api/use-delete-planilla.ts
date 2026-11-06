import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface DeletePlanillaInput {
  id: string
  /**
   * Además de la planilla, elimina los campos del catálogo que SÓLO ella usaba. No toca
   * los que siga usando otra planilla activa.
   */
  eliminarCamposSinUso?: boolean
}

export function useDeletePlanilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, eliminarCamposSinUso }: DeletePlanillaInput) =>
      apiClient.delete<{ message: string }>(
        `/api/planillas/${id}${eliminarCamposSinUso ? "?eliminarCamposSinUso=true" : ""}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
      // El catálogo cambia si se limpiaron campos, y el conteo de uso del resto también.
      qc.invalidateQueries({ queryKey: ["campos"] })
    },
  })
}
