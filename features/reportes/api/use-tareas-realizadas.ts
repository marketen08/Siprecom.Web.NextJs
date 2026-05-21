import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  TareasRealizadasFiltros,
  TareasRealizadasPreview,
} from "../types"

function buildParams(filtros: TareasRealizadasFiltros): Record<string, string> {
  const p: Record<string, string> = {}
  if (filtros.fechaDesde)     p.fechaDesde     = filtros.fechaDesde
  if (filtros.fechaHasta)     p.fechaHasta     = filtros.fechaHasta
  if (filtros.usuarioId)      p.usuarioId      = filtros.usuarioId
  if (filtros.estado != null) p.estado         = String(filtros.estado)
  if (filtros.nivelId)        p.nivelId        = filtros.nivelId
  if (filtros.sistemaId)      p.sistemaId      = filtros.sistemaId
  if (filtros.subSistemaId)   p.subSistemaId   = filtros.subSistemaId
  if (filtros.especialidadId) p.especialidadId = filtros.especialidadId
  return p
}

export function useGetTareasRealizadasPreview(filtros: TareasRealizadasFiltros) {
  const params = buildParams(filtros)
  return useQuery({
    queryKey: ["reportes", "tareas-realizadas", "preview", params],
    queryFn: () =>
      apiClient.get<ApiResponse<TareasRealizadasPreview>>(
        "/api/reportes/tareas-realizadas/preview",
        Object.keys(params).length > 0 ? params : undefined,
      ),
  })
}

export function buildTareasRealizadasPdfUrl(filtros: TareasRealizadasFiltros): string {
  const params = buildParams(filtros)
  const qs = new URLSearchParams(params).toString()
  return qs.length > 0
    ? `/api/reportes/tareas-realizadas/pdf?${qs}`
    : "/api/reportes/tareas-realizadas/pdf"
}
