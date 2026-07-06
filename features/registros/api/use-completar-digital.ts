import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CompletarDigitalInput } from "../types"

export function useCompletarDigital(registroId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CompletarDigitalInput) =>
      apiClient.post(`/api/registros/${registroId}/completar/digital`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registros", registroId] })
      queryClient.invalidateQueries({ queryKey: ["elementos-tareas"] })
      queryClient.invalidateQueries({ queryKey: ["avance"] })
      // Si el registro pertenece a una tarea de un TestGroup, la lista del pack
      // queda stale al volver al detalle. Invalidamos el prefix genérico para
      // que `useGetTareasPack` (["testgroups", tgId, "tareas"]) refetch.
      queryClient.invalidateQueries({ queryKey: ["testgroups"] })
      // Tras completar, el registro pasa a estado COMPLETADO y aparecen slots
      // de firma pendientes — refrescar la pantalla "Mis firmas".
      queryClient.invalidateQueries({ queryKey: ["mis-firmas"] })
    },
  })
}
