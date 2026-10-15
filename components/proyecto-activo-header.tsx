"use client"

import { usePathname } from "next/navigation"
import { AlertTriangle, FolderKanban } from "lucide-react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"

/**
 * Header contextual con dos modos según la ruta:
 *
 * - **Proyecto** (chip azul): pantallas dependientes del proyecto activo del user.
 *   Alcance completo. Cambiar de proyecto en el switcher del navbar cambia el
 *   contenido — el chip refuerza el scope efectivo.
 *
 * - **Tenant / global** (chip amber): pantallas de Configuración cuyos cambios
 *   impactan a todos los proyectos del tenant. Aviso explícito para el
 *   AdminGlobal, que es quien tiene acceso a esa sección.
 *
 * Se auto-oculta en pantallas que no matchean (Dashboard, Ejecución, Reportes,
 * Perfil, Super Admin, etc.) o cuando el user no tiene proyecto activo.
 */

// Prefijos donde mostrar el chip AZUL (contexto proyecto activo).
const PREFIJOS_CONTEXTO_PROYECTO = [
  "/alcance",
] as const

// Prefijos donde mostrar el chip AMBER (configuración global del tenant).
// Todos los ítems que quedaron bajo Configuración post-rediseño impactan a
// todo el tenant. `/configuracion/proyectos` NO va acá — es ABM de proyectos
// y se movió al menú bajo Alcance; editar un proyecto no impacta a los demás.
const PREFIJOS_CONTEXTO_TENANT = [
  "/configuracion/especialidades",
  "/configuracion/elementos-tipos",
  "/configuracion/niveles",
  "/configuracion/pendientes-categorias",
  "/configuracion/pendientes-tipos",
  "/configuracion/pendientes-acciones",
  "/configuracion/pendientes-motivos",
  "/configuracion/pendientes-catalogo",
  "/configuracion/importacion-maestro-pendientes",
  "/configuracion/campos",
  "/configuracion/planillas",
  "/configuracion/procedimientos",
  "/configuracion/clientes",
  "/configuracion/contratistas",
] as const

function matchesPrefix(pathname: string | null, prefijos: readonly string[]): boolean {
  if (!pathname) return false
  return prefijos.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function ProyectoActivoHeader() {
  const pathname = usePathname()
  const { data: perfil } = useGetPerfil()

  // Prioridad al warning tenant si por alguna razón matchean ambas listas
  // (son disjuntas por diseño, pero preferimos ser explícitos).
  if (matchesPrefix(pathname, PREFIJOS_CONTEXTO_TENANT)) {
    return (
      <div
        className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900"
        aria-label="Configuración global del tenant"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <span className="font-semibold">Configuración global.</span>{" "}
          <span className="text-amber-800/90">
            Los cambios en esta sección impactan a <b>todos los proyectos</b>.
          </span>
        </div>
      </div>
    )
  }

  if (matchesPrefix(pathname, PREFIJOS_CONTEXTO_PROYECTO)) {
    if (!perfil?.proyectoId) return null
    const nombre = perfil.proyectoNombre?.trim() || "Sin nombre"
    return (
      <div
        className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800"
        aria-label="Proyecto activo"
      >
        <FolderKanban className="h-3.5 w-3.5 shrink-0" />
        <span className="text-blue-700/80">Trabajando en:</span>
        <span className="font-semibold text-blue-900 truncate">{nombre}</span>
      </div>
    )
  }

  return null
}
