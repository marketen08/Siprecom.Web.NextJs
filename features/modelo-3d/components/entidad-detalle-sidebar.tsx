"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowUpRight, Box, ChevronDown, Hash, Layers, Link2, Link2Off, ListChecks, Loader2, Tag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetAvanceElemento } from "@/features/avance/api/use-get-avance-elemento"
import { useGetElementosTareasPorElemento } from "@/features/elementos-tareas/api/use-get-elementostareas-por-elemento"
import { ElementoDetalleSheet } from "@/features/avance/components/elemento-detalle-sheet"
import type { AvanceElementoDTO } from "@/features/avance/types"
import type { ElementoTarea } from "@/features/elementos-tareas/types"
import type { ProyectoIfcEntidad } from "../types"

interface Props {
  proyectoId: string
  entidad: ProyectoIfcEntidad
  onClose: () => void
}

/**
 * Sidebar lateral que aparece al hacer click en una entidad del visor 3D.
 * Muestra la info de la entidad IFC y, si está vinculada a un Elemento del
 * proyecto, atajos para ir a su pantalla de avance / registros / pendientes.
 */
export function EntidadDetalleSidebar({ proyectoId, entidad, onClose }: Props) {
  // Solo pegamos al backend si la entidad está vinculada a un Elemento. Si no,
  // skip — no hay nada que mostrar de tareas / subsistema / avance.
  const avanceQuery = useGetAvanceElemento(entidad.elementoId ?? null)
  const avance = avanceQuery.data?.data ?? null

  // Tareas del elemento — para desglosar el avance por nivel (PRECOM / COM).
  const tareasQuery = useGetElementosTareasPorElemento(entidad.elementoId ?? null)
  const tareas = tareasQuery.data?.data ?? []

  // Sheet de tareas del Elemento — el mismo de /ejecucion/elementos. Lo abrimos
  // inline desde "Ver avance del Elemento" en vez de navegar.
  const [avanceOpen, setAvanceOpen] = useState(false)

  // TAG protagonista: el del Elemento vinculado; si no hay, el detectado en el modelo.
  const tagPrincipal = entidad.elementoTag ?? entidad.tagDetectado ?? null

  return (
    <aside className="h-full w-full overflow-y-auto bg-white md:w-80 md:shrink-0 md:rounded-lg md:border md:border-gray-200 md:shadow-sm">
      {/* Header — el TAG es el protagonista */}
      <header className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
            {entidad.elementoId ? "Elemento" : "Entidad seleccionada"}
          </p>
          <h3 className="text-lg font-bold leading-tight wrap-break-word" title={tagPrincipal ?? entidad.ifcGuid}>
            {tagPrincipal ?? <span className="text-base font-semibold text-gray-400">Sin TAG</span>}
          </h3>
          {entidad.elementoNombre && (
            <p className="text-xs text-gray-500 mt-0.5 wrap-break-word">{entidad.elementoNombre}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 shrink-0"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="px-4 py-3 space-y-3 text-sm">
        {entidad.elementoId ? (
          <>
            {/* SubSistema — destacado */}
            <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700/80">
                <Layers className="h-3 w-3" /> SubSistema
              </div>
              {avance?.subSistemaNombre ? (
                <p className="text-sm font-semibold text-gray-900 mt-0.5 wrap-break-word">
                  {avance.subSistemaCodigo ? `${avance.subSistemaCodigo} · ` : ""}
                  {avance.subSistemaNombre}
                </p>
              ) : avanceQuery.isLoading ? (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">—</p>
              )}
            </div>

            {/* Tipo + Especialidad — atributos del ELEMENTO (no del subsistema) */}
            {avance?.elementoTipoNombre && (
              <div className="flex items-start gap-1.5 text-xs text-gray-700">
                <Box className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                <span className="wrap-break-word">
                  <span className="text-muted-foreground">Tipo: </span>
                  {avance.elementoTipoNombre}
                  {avance.elementoTipoEspecialidadNombre && (
                    <span className="text-muted-foreground"> · {avance.elementoTipoEspecialidadNombre}</span>
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-green-700">
              <Link2 className="h-3 w-3 shrink-0" />
              Vinculada {entidad.vinculadoManualmente ? "(manual)" : "(auto-match)"}
            </div>

            {/* Avance + desglose de tareas */}
            {avanceQuery.isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando avance…
              </div>
            )}
            {avance && (
              <AvanceResumen
                avance={avance}
                tareas={tareas}
                loadingTareas={tareasQuery.isLoading}
              />
            )}

            <div className="pt-1 space-y-1.5">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-between gap-2"
                onClick={() => setAvanceOpen(true)}
              >
                Ver avance del Elemento
                <ListChecks className="h-3.5 w-3.5" />
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-between gap-2">
                <Link href={`/ejecucion/pendientes?elementoId=${entidad.elementoId}`}>
                  Ver pendientes
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-between gap-2">
                <Link href={`/ejecucion/elementos?elementoId=${entidad.elementoId}`}>
                  Ir al Elemento
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <EntidadIfcDetails entidad={entidad} />

            <ElementoDetalleSheet
              elementoId={entidad.elementoId}
              avance={avance}
              open={avanceOpen}
              onClose={() => setAvanceOpen(false)}
            />
          </>
        ) : (
          <>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Link2Off className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">Sin vincular a Elemento</span>
              </div>
              <p className="text-xs text-amber-700">
                Esta entidad IFC no matcheó con ningún Elemento del proyecto. Vinculala manualmente
                desde el panel de entidades de abajo.
              </p>
            </div>

            <EntidadIfcDetails entidad={entidad} />
          </>
        )}
      </div>
    </aside>
  )
}

/**
 * Desplegable colapsado con los datos crudos de la entidad del modelo (IfcGuid,
 * Nombre IFC, Tipo, TAG detectado). Secundarios — el protagonista es el TAG del
 * Elemento, así que esto va oculto por defecto.
 */
function EntidadIfcDetails({ entidad }: { entidad: ProyectoIfcEntidad }) {
  return (
    <details className="group rounded-md border border-gray-200 bg-gray-50/50">
      <summary className="flex items-center justify-between gap-2 cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-600 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5 text-gray-400" /> Datos de la entidad (modelo)
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100">
        <Field icon={<Hash className="h-3 w-3" />} label="IfcGuid">
          <code className="text-[11px] break-all">{entidad.ifcGuid}</code>
        </Field>
        {entidad.nombre && (
          <Field icon={<Tag className="h-3 w-3" />} label="Nombre en el modelo">
            <span className="text-xs wrap-break-word">{entidad.nombre}</span>
          </Field>
        )}
        {entidad.ifcType && (
          <Field icon={<Box className="h-3 w-3" />} label="Tipo">
            <span className="text-xs wrap-break-word">{entidad.ifcType}</span>
          </Field>
        )}
        {entidad.tagDetectado && (
          <Field icon={<Tag className="h-3 w-3" />} label="TAG detectado">
            <span className="text-xs wrap-break-word">{entidad.tagDetectado}</span>
          </Field>
        )}
      </div>
    </details>
  )
}

function Field({
  icon, label, children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}

// Meta por estado (int EstadoElementoTarea) → label + color del chip.
const ESTADO_META: Record<number, { label: string; color: string; orden: number }> = {
  1: { label: "Pendiente",      color: "bg-gray-100 text-gray-700",      orden: 0 },
  2: { label: "En proceso",     color: "bg-blue-100 text-blue-700",      orden: 1 },
  3: { label: "Completado",     color: "bg-yellow-100 text-yellow-700",  orden: 2 },
  7: { label: "Firmado",        color: "bg-emerald-100 text-emerald-700", orden: 3 },
  4: { label: "Firmado físico", color: "bg-teal-100 text-teal-700",      orden: 4 },
  5: { label: "Rechazado",      color: "bg-red-100 text-red-700",        orden: 5 },
  6: { label: "Cancelado",      color: "bg-gray-50 text-gray-400",       orden: 6 },
}
const ESTADOS_TERMINALES = new Set([3, 4, 7]) // Completado / Firmado físico / Firmado

interface GrupoNivelAvance {
  key: string
  nombre: string
  posicion: number
  total: number        // sin contar CANCELADO
  completadas: number
  filas: { estado: number; label: string; color: string; value: number }[]
}

function agruparTareasPorNivel(tareas: ElementoTarea[]): GrupoNivelAvance[] {
  const mapa = new Map<string, GrupoNivelAvance & { _counts: Map<number, number> }>()
  for (const t of tareas) {
    const key = t.nivelId ?? "__sin_nivel__"
    let g = mapa.get(key)
    if (!g) {
      g = {
        key,
        nombre: t.nivelNombre ?? "Sin nivel",
        posicion: t.nivelPosicion ?? 999,
        total: 0,
        completadas: 0,
        filas: [],
        _counts: new Map(),
      }
      mapa.set(key, g)
    }
    g._counts.set(t.estado, (g._counts.get(t.estado) ?? 0) + 1)
    if (t.estado !== 6) g.total += 1            // CANCELADO no cuenta en el total
    if (ESTADOS_TERMINALES.has(t.estado)) g.completadas += 1
  }
  const grupos = [...mapa.values()].map((g) => {
    g.filas = [...g._counts.entries()]
      .map(([estado, value]) => ({
        estado,
        value,
        label: ESTADO_META[estado]?.label ?? `Estado ${estado}`,
        color: ESTADO_META[estado]?.color ?? "bg-gray-100 text-gray-700",
      }))
      .sort((a, b) => (ESTADO_META[a.estado]?.orden ?? 99) - (ESTADO_META[b.estado]?.orden ?? 99))
    return g
  })
  return grupos.sort((a, b) => a.posicion - b.posicion)
}

/**
 * Resumen visual del avance del Elemento: porcentaje global + barra, y el
 * desglose de tareas por estado SEPARADO POR NIVEL (PRECOMISIONADO / COMISIONADO).
 * Misma paleta que el EstadosPopover de la pantalla de avance.
 */
function AvanceResumen({
  avance, tareas, loadingTareas,
}: {
  avance: AvanceElementoDTO
  tareas: ElementoTarea[]
  loadingTareas: boolean
}) {
  const pct = Math.max(0, Math.min(100, Number(avance.porcentajeAvance) || 0))
  const grupos = agruparTareasPorNivel(tareas)

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 space-y-2">
      {/* Avance global */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">Avance</span>
        <span className="text-base font-semibold text-gray-900">
          {pct.toFixed(1)}<span className="text-xs text-muted-foreground">%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Desglose por nivel */}
      {loadingTareas ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando tareas…
        </p>
      ) : grupos.length === 0 ? (
        <p className="text-xs text-gray-400 italic pt-1">Sin tareas asignadas</p>
      ) : (
        grupos.map((g) => {
          const pctNivel = g.total > 0 ? Math.round((g.completadas / g.total) * 100) : 0
          return (
            <div key={g.key} className="pt-2 mt-1 border-t border-gray-100 first:border-t-0 first:mt-0 first:pt-1">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{g.nombre}</span>
                <span className="text-[11px] text-gray-500">
                  {g.completadas}/{g.total} · {pctNivel}%
                </span>
              </div>
              <ul className="space-y-0.5">
                {g.filas.map((f) => (
                  <li key={f.estado} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600">{f.label}</span>
                    <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${f.color}`}>
                      {f.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })
      )}
    </div>
  )
}
