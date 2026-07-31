import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { invalidarPostCargaRegistro } from "@/features/registros/api/invalidar-post-carga"

export function useIniciarTarea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (elementoTareaId: string) =>
      apiClient.post(`/api/elementos-tareas/${elementoTareaId}/iniciar`, {}),
    onSuccess: () => {
      // Mismo set de invalidaciones que el flujo de carga — la tarea pasa a
      // EN_PROCESO y hay que refrescar sheet + listado (`/ejecucion/tareas`) +
      // menú lazy + avance/estadísticas.
      invalidarPostCargaRegistro(queryClient, null)
    },
  })
}
