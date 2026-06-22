"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, FileSpreadsheet, FileText, Loader2, ScanSearch, Wrench } from "lucide-react"

import { useGetApsCodificaciones, setApsTagProperties } from "../api/use-aps-codificaciones"
import { useReBootstrapIfcArchivo } from "../api/use-ifc-entidades"
import { exportCodificacionesExcel, exportCodificacionesPdf } from "../lib/export-codificaciones"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  open: boolean
  onClose: () => void
  proyectoId: string
  archivoId: string | null
  archivoNombre?: string
}

// Heurística para pre-seleccionar: las formas que combinan letras Y números
// suelen ser TAGs reales (10-PF-4014, PMP-101); las puras ([A-Z]+ sola, como
// "PIPING") suelen ser contenedores → no se pre-seleccionan.
function pareceTag(patron: string): boolean {
  return patron.includes("\\d+") && patron.includes("[A-Z]+")
}

/**
 * Analiza el NWD y muestra las codificaciones de TAG detectadas (formas de
 * Item.Name). El usuario tilda las que representan elementos a trackear y copia
 * la lista lista para pegar en "Property names" del proyecto.
 */
export function CodificacionesSheet({ open, onClose, proyectoId, archivoId, archivoNombre }: Props) {
  const query = useGetApsCodificaciones(archivoId, open)
  const codis = useMemo(() => query.data?.data ?? [], [query.data])
  const reBootstrap = useReBootstrapIfcArchivo(proyectoId)

  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [copiado, setCopiado] = useState(false)

  // Pre-seleccionar las que parecen TAG cuando llegan los datos.
  useEffect(() => {
    if (codis.length > 0) {
      setSeleccion(new Set(codis.filter((c) => pareceTag(c.patron)).map((c) => c.patron)))
    }
  }, [codis])

  const propsSeleccionadas = codis
    .filter((c) => seleccion.has(c.patron))
    .map((c) => c.propTagSugerida)
    .join(",")

  function toggle(patron: string) {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (next.has(patron)) next.delete(patron)
      else next.add(patron)
      return next
    })
  }

  const todasSeleccionadas = codis.length > 0 && codis.every((c) => seleccion.has(c.patron))

  function toggleTodas() {
    setSeleccion(todasSeleccionadas ? new Set() : new Set(codis.map((c) => c.patron)))
  }

  async function copiar() {
    if (!propsSeleccionadas) return
    try {
      await navigator.clipboard.writeText(propsSeleccionadas)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* clipboard no disponible */ }
  }

  // Atajo: guarda los patrones seleccionados en el proyecto y re-arma el modelo.
  async function aplicarYReArmar() {
    if (!propsSeleccionadas || !archivoId) return
    await setApsTagProperties(proyectoId, propsSeleccionadas)
    await reBootstrap.mutateAsync(archivoId)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg! overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4" /> Codificaciones de TAG
          </SheetTitle>
          <SheetDescription>
            Patrones de nombre detectados en{" "}
            <b>{archivoNombre ?? "el modelo"}</b> (nodos Group/Composite). Tildá los
            que representan elementos a trackear y copiá la lista para pegarla en{" "}
            <b>Property names</b> del proyecto.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 mt-4 space-y-3">
          {query.isLoading && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Analizando el modelo… puede tardar hasta ~1 min en modelos grandes.
            </div>
          )}

          {query.isError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {(query.error as Error)?.message ?? "No se pudo analizar el modelo."}
            </div>
          )}

          {!query.isLoading && !query.isError && codis.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No se detectaron nombres en nodos lógicos del modelo.
            </p>
          )}

          {codis.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={todasSeleccionadas}
                    onChange={toggleTodas}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Seleccionar todo ({codis.length})
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => exportCodificacionesExcel(codis, seleccion, archivoNombre)}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => exportCodificacionesPdf(codis, seleccion, archivoNombre)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </div>
              </div>

              <ul className="space-y-1.5">
                {codis.map((c) => (
                  <li key={c.patron}>
                    <label className="flex items-start gap-2 rounded-md border border-gray-200 p-2.5 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={seleccion.has(c.patron)}
                        onChange={() => toggle(c.patron)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">{c.cantidad.toLocaleString()} nodos</span>
                          <span className="text-xs text-muted-foreground truncate">ej: {c.ejemplo}</span>
                        </div>
                        <code className="text-[11px] text-blue-700 wrap-break-word">{c.propTagSugerida}</code>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Selección ({seleccion.size})
                  </span>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={copiar} disabled={!propsSeleccionadas}>
                    {copiado ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiado ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <code className="block text-[11px] text-gray-700 wrap-break-word">
                  {propsSeleccionadas || "— elegí al menos un patrón —"}
                </code>
              </div>

              {/* Atajo: aplicar al proyecto + re-armar de una. */}
              <ConfirmActionDialog
                trigger={<><Wrench className="h-4 w-4" /> Aplicar y re-armar</>}
                triggerClassName="inline-flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-blue-900 bg-blue-900 px-3 text-sm font-medium text-white hover:bg-blue-800"
                title="¿Aplicar estos patrones y re-armar?"
                description={
                  <>
                    Se guardarán los patrones seleccionados como <b>Property names</b> del
                    proyecto y se <b>re-armará</b> la estructura (Sistemas/SubSistemas/Elementos)
                    del modelo. Esta acción borra la estructura actual y no se puede deshacer.
                    Se rechaza si el proyecto ya tiene registros de avance.
                  </>
                }
                confirmText="Aplicar y re-armar"
                pendingText="Aplicando…"
                variant="destructive"
                onConfirm={aplicarYReArmar}
              />

              <p className="text-xs text-muted-foreground">
                O copiá la lista y pegala manualmente en <b>Property names</b> del proyecto.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
