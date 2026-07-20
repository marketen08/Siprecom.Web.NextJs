import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Pendiente, PendienteCreateInput } from "../types"

export function useCreatePendiente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PendienteCreateInput) =>
      apiClient.post<ApiResponse<Pendiente>>("/api/pendientes", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendientes"] })
      // Si el pendiente se creó desde el visor de PID, los pines de ese PID
      // vienen de /pid-archivos/{id}/pendientes → refrescar para que aparezca
      // el pin al instante sin recargar la página.
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
    },
  })
}
