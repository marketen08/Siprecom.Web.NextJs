import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  ListadoPendientesFiltros,
  ListadoPendientesPreview,
} from "../types"

function buildParams(filtros: ListadoPendientesFiltros): Record<string, string> {
  const p: Record<string, string> = {}
  if (filtros.sistemaId)         p.sistemaId      = filtros.sistemaId
  if (filtros.subSistemaId)      p.subSistemaId   = filtros.subSistemaId
  if (filtros.categoriaId)       p.categoriaId    = filtros.categoriaId
  if (filtros.tipoId)            p.tipoId         = filtros.tipoId
  if (filtros.estadoId)          p.estadoId       = filtros.estadoId
  if (filtros.responsableId)     p.responsableId  = filtros.responsableId
  if (filtros.prioridad != null) p.prioridad      = String(filtros.prioridad)
  // Solo enviamos soloAbiertos cuando el usuario lo CAMBIA al opuesto del default (false).
  // Default backend = true; mandar siempre causaría URLs ruidosas. Pero por claridad lo
  // mandamos siempre y dejamos que el server interprete.
  if (filtros.soloAbiertos != null) p.soloAbiertos = String(filtros.soloAbiertos)
  return p
}

export function useGetListadoPendientesPreview(filtros: ListadoPendientesFiltros) {
  const params = buildParams(filtros)
  return useQuery({
    queryKey: ["reportes", "listado-pendientes", "preview", params],
    queryFn: () =>
      apiClient.get<ApiResponse<ListadoPendientesPreview>>(
        "/api/reportes/listado-pendientes/preview",
        Object.keys(params).length > 0 ? params : undefined,
      ),
  })
}

export function buildListadoPendientesPdfUrl(filtros: ListadoPendientesFiltros): string {
  const params = buildParams(filtros)
  const qs = new URLSearchParams(params).toString()
  return qs.length > 0
    ? `/api/reportes/listado-pendientes/pdf?${qs}`
    : "/api/reportes/listado-pendientes/pdf"
}
