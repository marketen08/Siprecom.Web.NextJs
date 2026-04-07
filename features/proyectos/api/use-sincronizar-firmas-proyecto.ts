import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface SincronizarFirmasResult {
  registrosProcesados: number
  slotsSincronizados: number
  registrosOmitidos: number
}

export function useSincronizarFirmasProyecto(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient.post<{ data: SincronizarFirmasResult }>(`/api/proyectos/${proyectoId}/firmas-config/sincronizar`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos", proyectoId, "firmas-pendientes"] })
    },
  })
}
