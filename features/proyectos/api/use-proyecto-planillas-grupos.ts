import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/**
 * GET /proyectos/{id}/planillas-grupos — devuelve la lista de IDs de grupos
 * de planillas habilitados en el proyecto.
 */
export function useGetProyectoPlanillasGrupos(proyectoId: string | null) {
  return useQuery({
    queryKey: ["proyectos", proyectoId, "planillas-grupos"],
    queryFn: () => apiClient.get<string[]>(`/api/proyectos/${proyectoId}/planillas-grupos`),
    enabled: !!proyectoId,
    staleTime: 1000 * 60,
  })
}

/**
 * PUT /proyectos/{id}/planillas-grupos — reemplaza atómicamente el set de
 * grupos habilitados. Invalida el select de planillas disponibles del proyecto
 * (que usa el filtro estricto).
 */
export function useSetProyectoPlanillasGrupos(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (grupoIds: string[]) =>
      apiClient.put(`/api/proyectos/${proyectoId}/planillas-grupos`, { grupoIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos", proyectoId, "planillas-grupos"] })
      // Al cambiar los grupos habilitados, cambia qué planillas se ofrecen
      // en el tarea-form → invalidar el select.
      qc.invalidateQueries({ queryKey: ["planillas", "disponibles", proyectoId] })
    },
  })
}
