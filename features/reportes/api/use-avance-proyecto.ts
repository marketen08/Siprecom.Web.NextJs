import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceProyectoFiltros, AvanceProyectoPreview } from "../types"

function buildParams(filtros: AvanceProyectoFiltros): Record<string, string> {
  const p: Record<string, string> = {}
  if (filtros.nivelId)        p.nivelId        = filtros.nivelId
  if (filtros.sistemaId)      p.sistemaId      = filtros.sistemaId
  if (filtros.subSistemaId)   p.subSistemaId   = filtros.subSistemaId
  if (filtros.especialidadId) p.especialidadId = filtros.especialidadId
  return p
}

export function useGetAvanceProyectoPreview(filtros: AvanceProyectoFiltros) {
  const params = buildParams(filtros)
  return useQuery({
    queryKey: ["reportes", "avance-proyecto", "preview", params],
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceProyectoPreview>>(
        "/api/reportes/avance-proyecto/preview",
        Object.keys(params).length > 0 ? params : undefined,
      ),
  })
}

export function buildAvanceProyectoPdfUrl(filtros: AvanceProyectoFiltros): string {
  const params = buildParams(filtros)
  const qs = new URLSearchParams(params).toString()
  return qs.length > 0
    ? `/api/reportes/avance-proyecto/pdf?${qs}`
    : "/api/reportes/avance-proyecto/pdf"
}
