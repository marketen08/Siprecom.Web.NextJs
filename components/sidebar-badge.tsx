"use client"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useTareasListadoCounts } from "@/features/tareas-listado/api/use-tareas-listado"
import { useSearchPendientes } from "@/features/pendientes/api/use-search-pendientes"
import { PENDIENTE_ESTADO_IDS } from "@/features/pendientes/types"
import type { SidebarBadgeKey } from "@/lib/nav-menu"

/**
 * Badge dinámico para items del sidebar. Cada key encapsula su propio fetch
 * (`useQuery`) para no acoplar el Sidebar a los hooks de datos específicos.
 * Devuelve `null` mientras carga o si el contador es 0 — no mostramos "0"
 * porque agrega ruido visual sin información útil.
 */
export function SidebarBadge({ kind }: { kind: SidebarBadgeKey }) {
  switch (kind) {
    case "tareas-pendientes-mias":
      return <TareasPendientesMiasBadge />
    case "pendientes-abiertos-mios":
      return <PendientesAbiertosMiosBadge />
    default:
      return null
  }
}

/**
 * Cantidad de tareas (ElementoTarea) asignadas al usuario actual en estados
 * no-terminales — mismo `pendientes` que usa el chip en /ejecucion/tareas
 * (PENDIENTE + EN_PROCESO). Refleja "cuánto trabajo tengo pendiente".
 */
function TareasPendientesMiasBadge() {
  const { data: perfil } = useGetPerfil()
  const { data: counts } = useTareasListadoCounts({
    asignadoA: perfil?.id,
  })

  const pendientes = counts?.pendientes ?? 0
  if (!perfil?.id || pendientes <= 0) return null

  // Cap visual en 99+ para no romper el layout del sidebar con números largos.
  const label = pendientes > 99 ? "99+" : String(pendientes)

  return (
    <span
      className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white leading-none"
      title={`${pendientes} tarea(s) pendiente(s) asignada(s)`}
    >
      {label}
    </span>
  )
}

/**
 * Cantidad de Pendientes en estado ABIERTO donde el user es "dueño" — misma
 * semántica que el tab "Míos" de /ejecucion/pendientes: creador (DetectadoPor)
 * OR responsable nominal OR miembro activo del grupo co-responsable.
 * Antes filtraba sólo por responsableId, así que los asignados por grupo (sin
 * responsable nominal) no contaban en el badge aunque sí aparecían en el tab.
 *
 * Usa `soloMios: true` para delegar la resolución al backend, que espeja el
 * OR en query — y respeta el vínculo vivo del grupo (si te sacan de un grupo,
 * el badge se actualiza).
 *
 * Usa el mismo endpoint /pendientes/search que la pantalla, con pageSize=1
 * (solo queremos `.total`, no las filas).
 */
function PendientesAbiertosMiosBadge() {
  const { data: perfil } = useGetPerfil()
  const { data } = useSearchPendientes({
    page: 1,
    pageSize: 1,
    filter: perfil?.id
      ? { estadoId: PENDIENTE_ESTADO_IDS.ABIERTO, soloMios: true }
      : undefined,
  })

  const total = data?.total ?? 0
  if (!perfil?.id || total <= 0) return null

  const label = total > 99 ? "99+" : String(total)

  return (
    <span
      className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white leading-none"
      title={`${total} pendiente(s) abierto(s) asignado(s)`}
    >
      {label}
    </span>
  )
}
