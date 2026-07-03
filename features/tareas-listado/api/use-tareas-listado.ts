import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { TareasListadoFiltros, TareasListadoPaged } from "../types"

/** Serializa los filtros a un query string. Deja fuera las claves vacías. */
export function buildQuery(filtros: TareasListadoFiltros, extras?: Record<string, string | number>): string {
  const p = new URLSearchParams()
  if (filtros.sistemaId) p.set("sistemaId", filtros.sistemaId)
  if (filtros.subSistemaId) p.set("subSistemaId", filtros.subSistemaId)
  if (filtros.especialidadId) p.set("especialidadId", filtros.especialidadId)
  if (filtros.elementoTipoId) p.set("elementoTipoId", filtros.elementoTipoId)
  if (filtros.nivelId) p.set("nivelId", filtros.nivelId)
  if (filtros.estados && filtros.estados.length > 0) {
    for (const e of filtros.estados) p.append("estados", String(e))
  }
  if (filtros.prioridad != null) p.set("prioridad", String(filtros.prioridad))
  if (filtros.search && filtros.search.trim()) p.set("search", filtros.search.trim())
  if (extras) {
    for (const [k, v] of Object.entries(extras)) p.set(k, String(v))
  }
  const qs = p.toString()
  return qs ? `?${qs}` : ""
}

export function useTareasListado(filtros: TareasListadoFiltros, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["tareas-listado", filtros, page, pageSize],
    queryFn: () =>
      apiClient.get<ApiResponse<TareasListadoPaged>>(
        `/api/reportes/tareas${buildQuery(filtros, { page, pageSize })}`,
      ),
  })
}

/** Descarga directa del .xlsx aplicando los mismos filtros. */
export function descargarTareasExcel(filtros: TareasListadoFiltros): void {
  const url = `/api/reportes/tareas/excel${buildQuery(filtros)}`
  const a = document.createElement("a")
  a.href = url
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
