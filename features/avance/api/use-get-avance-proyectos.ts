import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, PagedResponse } from "@/features/proyectos/types"
import type { AvanceProyectoResumenDTO } from "../types"

interface Params {
  /** EstadoProyecto a filtrar. Sin valor = todos los estados. */
  estado?: number
  /**
   * Nivel a filtrar. RECALCULA el % de cada proyecto con las tareas de ese nivel y
   * deja fuera los proyectos que no tienen ninguna — no es un filtro de filas sobre
   * el % total. Misma semántica que el filtro de nivel de /estadisticas/avance-subsistemas.
   */
  nivelId?: string
  page?: number
  pageSize?: number
}

/**
 * Avance resumen de los proyectos accesibles, filtrado por estado y paginado.
 *
 * El filtro y la paginación son del SERVIDOR, no del cliente. Antes traía todos
 * los proyectos y filtraba en memoria: con los 149 de Pluspetrol migrados el
 * backend hacía ~1.000 queries (una tanda de avance completa por proyecto) y la
 * pantalla quedaba colgada en "cargando".
 *
 * La respuesta viene envuelta en {message, data} porque el AvanceController usa
 * ToActionResult(); de ahí el `.data.data` en los consumidores.
 */
export function useGetAvanceProyectos(params: Params = {}) {
  const { estado, nivelId, page = 1, pageSize = 20 } = params

  return useQuery({
    queryKey: ["avance", "proyectos", { estado, nivelId, page, pageSize }],
    queryFn: () =>
      apiClient.get<ApiResponse<PagedResponse<AvanceProyectoResumenDTO>>>("/api/avance/proyectos", {
        page,
        pageSize,
        ...(estado != null ? { estado } : {}),
        ...(nivelId ? { nivelId } : {}),
      }),
    // Mantener la página anterior visible mientras llega la nueva evita que la
    // tabla parpadee a "cargando" en cada cambio de página o de filtro.
    placeholderData: (previa) => previa,
  })
}
