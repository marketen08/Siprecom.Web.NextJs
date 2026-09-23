import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Pendiente, PendienteCreateInput } from "../types"
import { invalidarColoresPorPendiente } from "@/features/modelo-3d/api/use-ifc-entidades"

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
      // El coloreado por pendientes de la maqueta 3D cachea el bucket de cada
      // Elemento — sin esto había que recargar la página para verlo pintado.
      void invalidarColoresPorPendiente(qc)
    },
  })
}
