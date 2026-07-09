import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface Resultado {
  message: string
  agregados: number
  reactivados: number
  existentes: number
}

/** Bulk-add: agrega todos los miembros activos del grupo al proyecto en una sola operación.
 * Idempotente: los ya asignados se skipean, los inactivos se reactivan. */
export function useAddUsuariosDesdeGrupo(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (grupoId: string) =>
      apiClient.post<Resultado>(`/api/proyectos/${proyectoId}/usuarios/desde-grupo`, { grupoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyecto-usuarios", proyectoId] })
    },
  })
}
