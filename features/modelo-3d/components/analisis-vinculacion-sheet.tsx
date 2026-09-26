"use client"

import { AlertTriangle, CheckCircle2, Loader2, Search } from "lucide-react"

import { useGetAnalisisVinculacion } from "../api/use-aps-codificaciones"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  open: boolean
  onClose: () => void
  archivoId: string | null
  archivoNombre?: string
}

/**
 * Análisis de vinculación — acción manual sobre una maqueta.
 *
 * Contesta la pregunta que antes había que resolver a mano con consultas sueltas:
 * de los Elementos que quedaron sin pieza, ¿alguno tiene su TAG en una property
 * del modelo que no estamos leyendo, o realmente no están en la maqueta?
 *
 * A diferencia del analizador de codificaciones, acá se revisan TODAS las
 * properties del modelo, no solo las que por nombre parecen llevar un TAG.
 */
export function AnalisisVinculacionSheet({ open, onClose, archivoId, archivoNombre }: Props) {
  const query = useGetAnalisisVinculacion(archivoId, open)
  const data = query.data?.data ?? null
  const error = query.error as Error | null

  const conCoincidencia = (data?.elementos ?? []).filter((e) => e.properties.length > 0)
  const sinCoincidencia = (data?.elementos ?? []).filter((e) => e.properties.length === 0)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Análisis de vinculación
          </SheetTitle>
          <SheetDescription>
            Busca el TAG de cada Elemento <b>sin pieza</b> en todas las properties de{" "}
            <b>{archivoNombre ?? "la maqueta"}</b>, para distinguir «está pero con otra
            property» de «no está en el modelo».
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-3 sm:px-4 pb-6 space-y-3">
          {query.isFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Analizando…
            </div>
          )}

          {error && !query.isFetching && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {error.message}
            </div>
          )}

          {data && !query.isFetching && (
            <>
              <div
                className={`rounded-md border p-3 text-sm flex items-start gap-2 ${
                  data.conCoincidencia > 0
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                {data.conCoincidencia > 0
                  ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  : <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
                <span className="leading-snug">{data.mensaje}</span>
              </div>

              {data.porProperty.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Properties donde aparecen
                  </h3>
                  <ul className="space-y-1">
                    {data.porProperty.map((p) => (
                      <li
                        key={p.property}
                        className="flex items-baseline justify-between gap-2 rounded-md border border-gray-200 px-2.5 py-1.5"
                      >
                        <code className="text-[11px] text-blue-700 wrap-break-word">{p.property}</code>
                        <span className="shrink-0 text-xs text-gray-600 tabular-nums">
                          {p.elementos} elem.
                          {p.yaConfigurada && (
                            <span className="ml-1.5 text-[10px] text-emerald-700">ya configurada</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Agregá las que no estén configuradas a <b>Property names</b> del proyecto y
                    re-procesá la maqueta. Ponelas al final de la lista: adelante pueden pisarle
                    el TAG a objetos que ya vinculan bien.
                  </p>
                </div>
              )}

              {conCoincidencia.length > 0 && (
                <Detalle titulo="Elementos que sí están en el modelo" items={conCoincidencia} />
              )}
              {sinCoincidencia.length > 0 && (
                <Detalle
                  titulo="Sin rastro en ninguna property"
                  items={sinCoincidencia}
                  nota="Su TAG no figura en el modelo con ningún nombre de property. No es un problema de configuración."
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Detalle({
  titulo, items, nota,
}: {
  titulo: string
  items: { elementoId: string; tag: string; nombre: string | null; properties: string[] }[]
  nota?: string
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {titulo} ({items.length})
      </h3>
      {nota && <p className="text-[11px] text-muted-foreground mb-1.5">{nota}</p>}
      <ul className="space-y-1 max-h-72 overflow-y-auto">
        {items.map((e) => (
          <li key={e.elementoId} className="rounded-md border border-gray-200 px-2.5 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-xs font-medium text-gray-800">{e.tag}</span>
              {e.nombre && e.nombre !== e.tag && (
                <span className="text-[11px] text-muted-foreground truncate">{e.nombre}</span>
              )}
            </div>
            {e.properties.length > 0 && (
              <code className="text-[10px] text-blue-700 wrap-break-word">
                {e.properties.join(" · ")}
              </code>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
