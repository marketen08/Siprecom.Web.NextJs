import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Pendiente, PendienteUpdateInput } from "../types"
import { invalidarColoresPorPendiente } from "@/features/modelo-3d/api/use-ifc-entidades"

export function useUpdatePendiente(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PendienteUpdateInput) =>
      apiClient.put<ApiResponse<Pendiente>>(`/api/pendientes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendientes"] })
      qc.invalidateQueries({ queryKey: ["pendientes", id] })
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
      // El coloreado por pendientes de la maqueta 3D cachea el bucket de cada
      // Elemento — sin esto había que recargar la página para verlo pintado.
      void invalidarColoresPorPendiente(qc)
    },
  })
}
