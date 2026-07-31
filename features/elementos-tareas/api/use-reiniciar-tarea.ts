import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { invalidarPostCargaRegistro } from "@/features/registros/api/invalidar-post-carga"

export function useReiniciarTarea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (elementoTareaId: string) =>
      apiClient.post(`/api/elementos-tareas/${elementoTareaId}/reiniciar`, {}),
    onSuccess: () => {
      // La tarea vuelve a PENDIENTE — refrescar los mismos scopes que un
      // completado (sheet, listados, avance, testgroups, firmas, etc.).
      invalidarPostCargaRegistro(queryClient, null)
    },
  })
}
