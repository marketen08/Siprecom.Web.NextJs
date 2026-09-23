import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Elemento } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  /** Búsqueda libre: matchea Nombre OR Tag OR PID. */
  nombre?: string
  sistemaId?: string
  subSistemaId?: string
  elementoTipoId?: string
  especialidadId?: string
  prioridad?: number
  /**
   * Vinculación con la maqueta 3D: true = solo con pieza, false = solo sin pieza,
   * undefined = todos. Cuenta solo maquetas activas.
   */
  enMaqueta?: boolean
}

export function useGetElementos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, sistemaId, subSistemaId, elementoTipoId, especialidadId, prioridad, enMaqueta } = params

  return useQuery({
    queryKey: ["elementos", { page, pageSize, nombre, sistemaId, subSistemaId, elementoTipoId, especialidadId, prioridad, enMaqueta }],
    queryFn: () =>
      apiClient.get<PagedResponse<Elemento>>("/api/elementos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(sistemaId ? { sistemaId } : {}),
        ...(subSistemaId ? { subSistemaId } : {}),
        ...(elementoTipoId ? { elementoTipoId } : {}),
        ...(especialidadId ? { especialidadId } : {}),
        ...(prioridad !== undefined ? { prioridad } : {}),
        // apiClient solo acepta string|number en la query: el binder de .NET
        // parsea "true"/"false" a bool? igual.
        ...(enMaqueta !== undefined ? { enMaqueta: String(enMaqueta) } : {}),
      }),
  })
}
