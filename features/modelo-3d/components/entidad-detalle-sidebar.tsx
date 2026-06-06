"use client"

import Link from "next/link"
import { ArrowUpRight, Hash, Layers, Link2, Link2Off, Loader2, Tag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetAvanceElemento } from "@/features/avance/api/use-get-avance-elemento"
import type { AvanceElementoDTO } from "@/features/avance/types"
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

  return (
    <aside className="w-80 shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm overflow-y-auto">
      <header className="flex items-start justify-between gap-2 px-4 pt-4 pb-2 border-b">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Entidad seleccionada
          </p>
          <h3 className="text-sm font-semibold truncate" title={entidad.tagDetectado ?? entidad.ifcGuid}>
            {entidad.tagDetectado ?? <span className="text-gray-400">Sin TAG</span>}
          </h3>
          {entidad.ifcType && (
            <p className="text-xs text-muted-foreground mt-0.5">{entidad.ifcType}</p>
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
        {/* IFC metadata */}
        <Field icon={<Hash className="h-3 w-3" />} label="IfcGuid">
          <code className="text-xs break-all">{entidad.ifcGuid}</code>
        </Field>
        {entidad.nombre && (
          <Field icon={<Tag className="h-3 w-3" />} label="Nombre IFC">
            <span className="text-xs">{entidad.nombre}</span>
          </Field>
        )}

        <hr className="border-gray-100" />

        {/* Linkeo con el Elemento */}
        {entidad.elementoId ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                Vinculada a un Elemento {entidad.vinculadoManualmente ? "(manual)" : "(auto-match)"}
              </span>
            </div>
            <div className="rounded-md border border-green-200 bg-green-50/50 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">TAG del Elemento</p>
              <p className="text-sm font-semibold">{entidad.elementoTag ?? "—"}</p>
              {entidad.elementoNombre && (
                <p className="text-xs text-gray-600">{entidad.elementoNombre}</p>
              )}

              {/* SubSistema + ElementoTipo + Especialidad — viene del endpoint de avance */}
              {avance && (
                <div className="pt-1.5 mt-1.5 border-t border-green-200 space-y-0.5 text-xs">
                  {avance.subSistemaNombre && (
                    <p className="flex items-start gap-1.5 text-gray-700">
                      <Layers className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                      <span>
                        <span className="text-muted-foreground">SubSistema: </span>
                        {avance.subSistemaCodigo ? `${avance.subSistemaCodigo} · ` : ""}
                        {avance.subSistemaNombre}
                      </span>
                    </p>
                  )}
                  {avance.elementoTipoNombre && (
                    <p className="text-gray-600 pl-4">
                      {avance.elementoTipoNombre}
                      {avance.elementoTipoEspecialidadNombre && (
                        <span className="text-muted-foreground"> · {avance.elementoTipoEspecialidadNombre}</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Avance + desglose de tareas */}
            {avanceQuery.isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando avance…
              </div>
            )}
            {avance && <AvanceResumen avance={avance} />}

            <div className="pt-2 space-y-1.5">
              <Button asChild size="sm" variant="outline" className="w-full justify-between gap-2">
                <Link href={`/ejecucion/elementos?elementoId=${entidad.elementoId}`}>
                  Ver avance del Elemento
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-between gap-2">
                <Link href={`/ejecucion/pendientes?elementoId=${entidad.elementoId}`}>
                  Ver pendientes
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-between gap-2">
                <Link href={`/alcance/elementos/${entidad.elementoId}`}>
                  Ir al Elemento
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </aside>
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

/**
 * Resumen visual del avance del Elemento. Muestra el porcentaje + barra de
 * progreso y un desglose de cantidad de tareas por estado. Misma paleta de
 * colores que el EstadosPopover de la pantalla de avance.
 */
function AvanceResumen({ avance }: { avance: AvanceElementoDTO }) {
  const filas = [
    { label: "Pendiente",      value: avance.pendiente,   color: "bg-gray-100 text-gray-700"     },
    { label: "En proceso",     value: avance.enProceso,   color: "bg-blue-100 text-blue-700"     },
    { label: "Completado",     value: avance.completado,  color: "bg-yellow-100 text-yellow-700" },
    { label: "Firmado",        value: avance.firmado,     color: "bg-emerald-100 text-emerald-700" },
    { label: "Firmado físico", value: avance.aprobado,    color: "bg-teal-100 text-teal-700"     },
    { label: "Rechazado",      value: avance.rechazado,   color: "bg-red-100 text-red-700"       },
    { label: "Cancelado",      value: avance.cancelado,   color: "bg-gray-50 text-gray-400"      },
  ].filter((f) => f.value > 0)

  const pct = Math.max(0, Math.min(100, Number(avance.porcentajeAvance) || 0))

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">Avance</span>
        <span className="text-base font-semibold text-gray-900">
          {pct.toFixed(1)}<span className="text-xs text-muted-foreground">%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <span className="text-xs font-medium text-muted-foreground">Tareas</span>
        <span className="text-xs text-gray-500">{avance.totalTareas} total</span>
      </div>
      {filas.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sin tareas asignadas</p>
      ) : (
        <ul className="space-y-0.5">
          {filas.map((f) => (
            <li key={f.label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600">{f.label}</span>
              <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${f.color}`}>
                {f.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
