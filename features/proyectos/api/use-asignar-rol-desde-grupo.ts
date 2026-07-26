import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface Resultado {
  message: string
  agregados: number
  reactivados: number
  existentes: number
}

/**
 * Bulk-add: asigna un rol de firma a todos los miembros activos del grupo en una
 * sola operación. Idempotente: los ya asignados se skipean, los inactivos se
 * reactivan. Snapshot al momento — cambios posteriores al grupo no se propagan.
 */
export function useAsignarRolDesdeGrupo(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ grupoId, rolNombre }: { grupoId: string; rolNombre: string }) =>
      apiClient.post<Resultado>(
        `/api/proyectos/${proyectoId}/usuarios-roles/desde-grupo`,
        { grupoId, rolNombre },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos", proyectoId, "usuarios-roles"] })
    },
  })
}
