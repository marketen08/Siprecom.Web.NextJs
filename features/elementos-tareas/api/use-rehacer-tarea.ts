import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { invalidarPostCargaRegistro } from "@/features/registros/api/invalidar-post-carga"

/**
 * Rehace una tarea ya firmada creando una ejecución nueva. NO anula la firma
 * anterior: la tarea firmada queda intacta y aparece una nueva en PENDIENTE.
 *
 * Es Admin-only del lado del backend. Distinto de `useReiniciarTarea`, que
 * descarta el registro y sólo aplica a tareas sin firmar.
 */
export function useRehacerTarea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ elementoTareaId, motivo }: { elementoTareaId: string; motivo: string }) =>
      apiClient.post(`/api/elementos-tareas/${elementoTareaId}/rehacer`, { motivo }),
    onSuccess: () => {
      // Cambia el estado del trabajo y el avance del subsistema (retrocede):
      // los mismos scopes que una carga de registro.
      invalidarPostCargaRegistro(queryClient, null)
    },
  })
}
