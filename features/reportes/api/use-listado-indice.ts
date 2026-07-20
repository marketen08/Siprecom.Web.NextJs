import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { ListadoIndiceFiltros, ListadoIndicePreview } from "../types"

function buildParams(filtros: ListadoIndiceFiltros): Record<string, string> {
  const p: Record<string, string> = {}
  if (filtros.nivelId)        p.nivelId        = filtros.nivelId
  if (filtros.sistemaId)      p.sistemaId      = filtros.sistemaId
  if (filtros.subSistemaId)   p.subSistemaId   = filtros.subSistemaId
  if (filtros.especialidadId) p.especialidadId = filtros.especialidadId
  if (filtros.elementoTipoId) p.elementoTipoId = filtros.elementoTipoId
  if (filtros.estado != null) p.estado         = String(filtros.estado)
  if (filtros.ocultarSinTareas) p.ocultarSinTareas = "true"
  return p
}

export function useGetListadoIndicePreview(filtros: ListadoIndiceFiltros) {
  const params = buildParams(filtros)
  return useQuery({
    queryKey: ["reportes", "listado-indice", "preview", params],
    queryFn: () =>
      apiClient.get<ApiResponse<ListadoIndicePreview>>(
        "/api/reportes/listado-indice/preview",
        Object.keys(params).length > 0 ? params : undefined,
      ),
  })
}

// URL del PDF con los filtros aplicados como query string. Se pasa a `downloadPdf` desde
// la página — el backend devuelve un PDF y el navegador lo guarda con el nombre del header.
export function buildListadoIndicePdfUrl(filtros: ListadoIndiceFiltros): string {
  const params = buildParams(filtros)
  const qs = new URLSearchParams(params).toString()
  return qs.length > 0
    ? `/api/reportes/listado-indice/pdf?${qs}`
    : "/api/reportes/listado-indice/pdf"
}
