"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, FileJson, Loader2, Upload } from "lucide-react"

import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  type ImportMaquetaPreview,
  usePreviewImportMaqueta,
  useImportarMaqueta,
} from "@/features/modelo-3d/api/use-ifc-archivos"

interface Props {
  open: boolean
  onClose: () => void
  proyectoId: string
}

// Nombres humanos del enum FormatoArchivo3d (Ifc=0, Nwd=1, Rvt=2 según el backend).
const FORMATO_LABEL: Record<number, string> = { 0: "IFC", 1: "NWD", 2: "RVT" }

export function ImportarMaquetaJsonSheet({ open, onClose, proyectoId }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<unknown>(null)
  const [preview, setPreview] = useState<ImportMaquetaPreview | null>(null)
  const [marcarPrincipal, setMarcarPrincipal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewMut = usePreviewImportMaqueta(proyectoId)
  const importMut = useImportarMaqueta(proyectoId)

  function reset() {
    setFile(null)
    setData(null)
    setPreview(null)
    setMarcarPrincipal(false)
    setError(null)
  }

  function handleClose() {
    if (previewMut.isPending || importMut.isPending) return
    reset()
    onClose()
  }

  async function handleFile(f: File | null) {
    setError(null)
    setPreview(null)
    setData(null)
    setFile(f)
    if (!f) return
    try {
      const text = await f.text()
      const parsed = JSON.parse(text)
      setData(parsed)
      const resp = await previewMut.mutateAsync(parsed)
      if (resp?.data) setPreview(resp.data)
      else setError(resp?.message ?? "No se pudo leer el archivo.")
    } catch (e) {
      setError((e as Error).message ?? "JSON inválido.")
    }
  }

  async function handleImportar() {
    if (!data) return
    setError(null)
    try {
      const resp = await importMut.mutateAsync({ data, marcarComoPrincipal: marcarPrincipal })
      if (resp?.data?.aplicado) {
        handleClose()
      } else {
        setError(resp?.message ?? "No se pudo importar la maqueta.")
      }
    } catch (e) {
      setError((e as Error).message ?? "Error al importar.")
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            Importar maqueta desde JSON
          </SheetTitle>
          <SheetDescription>
            Reutiliza una maqueta ya subida a APS en otro proyecto. Sólo se copia el registro
            y las entidades — el binario ya está en Autodesk.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-3">
          <label
            htmlFor="maqueta-json-file"
            className="flex items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 py-6 text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
          >
            <Upload className="h-4 w-4" />
            {file ? file.name : "Seleccionar archivo JSON…"}
          </label>
          <input
            id="maqueta-json-file"
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {previewMut.isPending && (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" /> Analizando…
            </div>
          )}

          {preview && (
            <div className="rounded-md border border-gray-200 bg-white p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">{preview.nombre}</span>
                <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                  {FORMATO_LABEL[preview.formatoArchivo] ?? "?"}
                </span>
              </div>
              {preview.disciplina && (
                <div className="text-xs text-muted-foreground">Disciplina: {preview.disciplina}</div>
              )}
              <div className="text-xs text-muted-foreground">
                Entidades: {preview.cantidadEntidades.toLocaleString("es-AR")}
              </div>
              <div className={`text-xs flex items-center gap-1.5 ${preview.apsListo ? "text-green-700" : "text-amber-700"}`}>
                {preview.apsListo
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> APS listo — se reutiliza la traducción existente.</>
                  : <><AlertTriangle className="h-3.5 w-3.5" /> APS aún no traducido — habrá que reprocesar.</>}
              </div>
              {preview.advertencias.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
                  {preview.advertencias.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex items-center gap-2 pt-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marcarPrincipal}
                  onChange={(e) => setMarcarPrincipal(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Marcar como maqueta principal del proyecto
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <SheetFooter className="px-4 pb-4">
          <Button variant="outline" onClick={handleClose} disabled={importMut.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={!preview || importMut.isPending || previewMut.isPending}
            className="gap-2"
          >
            {importMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
