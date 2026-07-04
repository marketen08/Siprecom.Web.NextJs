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
}

export function useGetElementos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, sistemaId, subSistemaId, elementoTipoId, especialidadId, prioridad } = params

  return useQuery({
    queryKey: ["elementos", { page, pageSize, nombre, sistemaId, subSistemaId, elementoTipoId, especialidadId, prioridad }],
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
      }),
  })
}
