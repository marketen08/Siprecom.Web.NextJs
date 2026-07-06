import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { FirmarRegistroInput } from "../types"

export function useFirmarRegistro(registroId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: FirmarRegistroInput) =>
      apiClient.post(`/api/registros/${registroId}/firmar`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registros", registroId] })
      queryClient.invalidateQueries({ queryKey: ["registros", registroId, "firmas"] })
      queryClient.invalidateQueries({ queryKey: ["elementos-tareas"] })
      queryClient.invalidateQueries({ queryKey: ["avance"] })
      // Si el registro pertenece a una tarea de un TestGroup, la lista del pack
      // queda stale al volver al detalle.
      queryClient.invalidateQueries({ queryKey: ["testgroups"] })
      // Tras firmar, el registro puede haberse cerrado y los slots cambian:
      // refrescar tanto "Pendientes" como "Firmados por mí".
      queryClient.invalidateQueries({ queryKey: ["mis-firmas"] })
    },
  })
}
