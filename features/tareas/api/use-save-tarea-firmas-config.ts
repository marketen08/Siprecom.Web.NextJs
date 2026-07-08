import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { FirmaConfigItem } from "@/features/proyectos/types"

/**
 * Reemplaza el override de firmas de la tarea (POST).
 * - Array con ≥1 item → la tarea usa ese override y IGNORA la config del proyecto.
 * - Array vacío `[]`  → borra el override y vuelve a heredar del proyecto.
 */
export function useSaveTareaFirmasConfig(tareaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (firmas: FirmaConfigItem[]) =>
      apiClient.post(`/api/tareas/${tareaId}/firmas-config`, firmas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tareas", tareaId, "firmas-config"] })
    },
  })
}
