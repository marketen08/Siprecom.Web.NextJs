import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PreservacionCiclosFilter, PreservacionCicloListItem } from "../types"

interface Response {
  data: PreservacionCicloListItem[]
  message: string
}

/**
 * Lista de ciclos de preservación del proyecto para el dashboard `/ejecucion/preservacion`.
 * Sin proyectoId, el backend usa el proyecto activo del usuario.
 */
export function useGetCiclosPreservacion(filter: PreservacionCiclosFilter) {
  const params: Record<string, string> = {}
  if (filter.proyectoId) params.proyectoId = filter.proyectoId
  if (filter.desde) params.desde = filter.desde
  if (filter.hasta) params.hasta = filter.hasta
  if (filter.estado != null) params.estado = String(filter.estado)
  if (filter.elementoId) params.elementoId = filter.elementoId

  return useQuery({
    queryKey: ["preservacion", "ciclos", params],
    queryFn: () => apiClient.get<Response>("/api/preservacion/ciclos", params),
  })
}
