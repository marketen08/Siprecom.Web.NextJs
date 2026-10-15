import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AuditoriaFiltros, AuditoriaPaged } from "../types"

export function buildQuery(f: AuditoriaFiltros, extras?: Record<string, string | number | boolean>): string {
  const p = new URLSearchParams()
  if (f.desde) p.set("desde", f.desde)
  if (f.hasta) p.set("hasta", f.hasta)
  if (f.usuarioId) p.set("usuarioId", f.usuarioId)
  if (f.entidades && f.entidades.length > 0) for (const e of f.entidades) p.append("entidades", e)
  if (f.acciones && f.acciones.length > 0) for (const a of f.acciones) p.append("acciones", a)
  if (f.search && f.search.trim()) p.set("search", f.search.trim())
  if (extras) for (const [k, v] of Object.entries(extras)) p.set(k, String(v))
  const qs = p.toString()
  return qs ? `?${qs}` : ""
}

export function useAuditoria(filtros: AuditoriaFiltros, page: number, pageSize: number, todosLosProyectos = false) {
  return useQuery({
    queryKey: ["auditoria", filtros, page, pageSize, todosLosProyectos],
    queryFn: () =>
      apiClient.get<ApiResponse<AuditoriaPaged>>(
        `/api/administracion/auditoria${buildQuery(filtros, { page, pageSize, todosLosProyectos })}`,
      ),
  })
}

export function descargarAuditoriaExcel(filtros: AuditoriaFiltros, todosLosProyectos = false): void {
  const qs = buildQuery(filtros, todosLosProyectos ? { todosLosProyectos: true } : {})
  const url = `/api/administracion/auditoria/excel${qs}`
  const a = document.createElement("a")
  a.href = url
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
