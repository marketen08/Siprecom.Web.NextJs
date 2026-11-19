"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react"

import { descargar, useAplicarAlcance, usePreviewAlcance } from "@/features/qaqc/api/use-qaqc"
import type { AlcanceImportPreview } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const ESTILO_FILA: Record<string, string> = {
  Nuevo: "text-green-700",
  Existe: "text-muted-foreground",
  Error: "text-red-700",
}

/**
 * Carga en bloque del alcance de los puntos por elemento o grupo, con el circuito de
 * siempre: se baja la plantilla (trae los puntos y lo ya cargado), se completa una fila
 * por elemento y punto, se previsualiza y se aplica. Aplicar solo agrega.
 */
export function AlcanceImportSheet({ pieId, pieCodigo, onCerrar }: { pieId: string; pieCodigo: string; onCerrar: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<AlcanceImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  const [bajando, setBajando] = useState(false)
  const previsualizar = usePreviewAlcance()
  const aplicar = useAplicarAlcance()

  async function bajarPlantilla() {
    setError(null)
    setBajando(true)
    try { await descargar(`proyecto/pies/${pieId}/alcance/plantilla`, `alcance ${pieCodigo}.xlsx`) }
    catch (e) { setError((e as Error).message) }
    finally { setBajando(false) }
  }

  async function elegir(f: File | undefined) {
    if (!f) return
    setArchivo(f)
    setPreview(null)
    setHecho(null)
    setError(null)
    try { setPreview((await previsualizar.mutateAsync({ pieId, archivo: f })).data) }
    catch (e) { setError((e as Error).message) }
    finally { if (input.current) input.current.value = "" }
  }

  async function confirmar() {
    if (!archivo) return
    setError(null)
    try {
      const r = await aplicar.mutateAsync({ pieId, archivo })
      setHecho(r.message)
      setPreview(null)
      setArchivo(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Alcance por elemento · {pieCodigo}</SheetTitle>
          <SheetDescription>
            Una fila por elemento (o test pack) y punto. La plantilla trae los puntos que van por elemento o por grupo, lo que ya está cargado y la lista de elementos del proyecto.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <ol className="space-y-3 text-sm">
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <span><strong>1.</strong> Bajá la plantilla y completá la hoja “Alcance”.</span>
              <Button size="sm" variant="outline" disabled={bajando} onClick={bajarPlantilla}>
                {bajando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Plantilla
              </Button>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <span><strong>2.</strong> Subila para ver qué se va a agregar.</span>
              <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
              <Button size="sm" variant="outline" disabled={previsualizar.isPending} onClick={() => input.current?.click()}>
                {previsualizar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Elegir archivo
              </Button>
            </li>
          </ol>

          {archivo && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileSpreadsheet className="h-3.5 w-3.5" />{archivo.name}</p>}

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md border p-2"><div className="text-lg font-semibold text-green-700">{preview.nuevos}</div>nuevos en {preview.puntos} punto(s)</div>
                <div className="rounded-md border p-2"><div className="text-lg font-semibold">{preview.existentes}</div>ya estaban</div>
                <div className="rounded-md border p-2"><div className="text-lg font-semibold text-red-700">{preview.conError}</div>con error</div>
              </div>
              {preview.errores.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
              <div className="max-h-80 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Fila</th>
                      <th className="px-2 py-1.5 text-left font-medium">Hoja</th>
                      <th className="px-2 py-1.5 text-left font-medium">Punto</th>
                      <th className="px-2 py-1.5 text-left font-medium">Tag / código</th>
                      <th className="px-2 py-1.5 text-left font-medium">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...preview.filas].sort((a, b) => (a.estado === "Error" ? -1 : 0) - (b.estado === "Error" ? -1 : 0) || a.fila - b.fila).map((f) => (
                      <tr key={f.fila}>
                        <td className="px-2 py-1 tabular-nums text-muted-foreground">{f.fila}</td>
                        <td className="px-2 py-1">{f.hoja ?? "—"}</td>
                        <td className="px-2 py-1">{f.punto}</td>
                        <td className="px-2 py-1 font-medium">{f.etiqueta}</td>
                        <td className={`px-2 py-1 text-xs ${ESTILO_FILA[f.estado]}`}>{f.estado === "Nuevo" ? "Se agrega" : f.mensaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="w-full" disabled={!preview.valido || aplicar.isPending} onClick={confirmar}>
                {aplicar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Agregar {preview.nuevos} al alcance
              </Button>
            </div>
          )}

          {hecho && <p className="flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{hecho}</p>}
          {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}
        </div>
      </SheetContent>
    </Sheet>
  )
}
