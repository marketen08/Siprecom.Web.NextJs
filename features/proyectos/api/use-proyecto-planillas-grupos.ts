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
      qc.invalidateQueries({ queryKey: ["proyectos", proyectoId, "colecciones-disponibles"] })
      // Al cambiar los grupos habilitados, cambia qué planillas se ofrecen
      // en el tarea-form → invalidar el select.
      qc.invalidateQueries({ queryKey: ["planillas", "disponibles", proyectoId] })
    },
  })
}

/** Una colección que el proyecto puede habilitar, con lo que le aportaría de verdad. */
export interface ColeccionDisponibleProyecto {
  id: string
  nombre: string
  descripcion: string | null
  /** Equipo dueño. Null = colección global. */
  equipoId: string | null
  habilitada: boolean
  /**
   * Cuántas planillas de esta colección quedarían realmente disponibles en el proyecto,
   * cruzando el eje equipo con el eje colección. Cero = habilitarla no cambia nada.
   */
  planillasQueAporta: number
}

/**
 * GET /proyectos/{id}/colecciones-disponibles — las colecciones que este proyecto PUEDE
 * habilitar (las de su equipo + las globales), cada una con su conteo real.
 *
 * Reemplaza la combinación "listado global de colecciones + lista de ids habilitados": ese
 * camino mostraba colecciones de otros equipos y un conteo global que podía decir 5 y aportar
 * 0, porque la disponibilidad cruza los dos ejes.
 */
export function useGetColeccionesDisponiblesProyecto(proyectoId: string | null) {
  return useQuery({
    queryKey: ["proyectos", proyectoId, "colecciones-disponibles"],
    queryFn: () => apiClient.get<{ data: ColeccionDisponibleProyecto[] }>(
      `/api/proyectos/${proyectoId}/colecciones-disponibles`),
    enabled: !!proyectoId,
    staleTime: 1000 * 60,
  })
}
