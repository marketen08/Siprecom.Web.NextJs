import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { invalidarPostCargaRegistro } from "@/features/registros/api/invalidar-post-carga"

export interface ReiniciarTareaVars {
  elementoTareaId: string
  /**
   * Por qué se descarta el registro. Lo exige el backend sólo cuando el registro ya
   * cerró con las firmas puestas en el papel (tarea en APROBADO).
   */
  motivo?: string
}

export function useReiniciarTarea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ elementoTareaId, motivo }: ReiniciarTareaVars) =>
      apiClient.post(`/api/elementos-tareas/${elementoTareaId}/reiniciar`, { motivo }),
    onSuccess: () => {
      // La tarea vuelve a PENDIENTE — refrescar los mismos scopes que un
      // completado (sheet, listados, avance, testgroups, firmas, etc.).
      invalidarPostCargaRegistro(queryClient, null)
    },
  })
}
