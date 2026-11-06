// El helper de descarga vive en features/estadisticas porque nació con los
// reportes, pero no tiene nada de estadísticas: hace el baile de blob → object
// URL → link temporal y respeta el filename que manda el backend.
import { downloadArchivo } from "@/features/estadisticas/api/download-pdf"

/**
 * Los mismos filtros que `useGetUsuarios`, sin paginación: el Excel baja el
 * padrón filtrado completo y no la página que se está viendo.
 */
export interface UsuariosExcelFiltros {
  nombre?: string
  /** true = solo dados de baja, false = solo activos, undefined = todos */
  isLocked?: boolean
  clienteId?: string
  rol?: string
  grupoId?: string
}

export function buildUsuariosExcelUrl(filtros: UsuariosExcelFiltros = {}): string {
  const p = new URLSearchParams()
  if (filtros.nombre) p.set("nombre", filtros.nombre)
  if (filtros.isLocked !== undefined) p.set("isLocked", String(filtros.isLocked))
  if (filtros.clienteId) p.set("clienteId", filtros.clienteId)
  if (filtros.rol) p.set("rol", filtros.rol)
  if (filtros.grupoId) p.set("grupoId", filtros.grupoId)
  const qs = p.toString()
  return `/api/usuarios/excel${qs ? `?${qs}` : ""}`
}

export function descargarUsuariosExcel(filtros: UsuariosExcelFiltros = {}) {
  return downloadArchivo(
    buildUsuariosExcelUrl(filtros),
    "usuarios.xlsx",
    "No se pudo generar el Excel.",
  )
}
