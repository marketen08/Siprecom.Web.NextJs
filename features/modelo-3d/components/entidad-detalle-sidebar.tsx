"use client"

import Link from "next/link"
import { ArrowUpRight, Hash, Link2, Link2Off, Tag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
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
            </div>

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
