"use client"

import { useRef, useState } from "react"
import { AlertCircle, CheckCircle2, FileJson, Loader2, Play, Upload } from "lucide-react"

import {
  parseFileJson,
  useImportPlanillaApply,
  useImportPlanillaPreview,
  type PlanillaImportPreview,
} from "@/features/planillas/api/use-import-export"

import { Button } from "@/components/ui/button"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  open: boolean
  onClose: () => void
}

export function ImportJsonSheet({ open, onClose }: Props) {
  const [jsonData, setJsonData] = useState<unknown | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<PlanillaImportPreview | null>(null)
  const [applyMensaje, setApplyMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewMut = useImportPlanillaPreview()
  const applyMut = useImportPlanillaApply()

  function reset() {
    setJsonData(null)
    setFileName(null)
    setPreview(null)
    setApplyMensaje(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPreview(null)
    setApplyMensaje(null)
    setError(null)
    if (!file) { setJsonData(null); setFileName(null); return }
    try {
      const data = await parseFileJson(file)
      setJsonData(data)
      setFileName(file.name)
    } catch (err) {
      setError((err as Error).message)
      setJsonData(null)
      setFileName(null)
    }
  }

  async function handlePreview() {
    if (!jsonData) return
    setError(null)
    setApplyMensaje(null)
    try {
      const resp = await previewMut.mutateAsync(jsonData)
      setPreview(resp.data)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleApply() {
    if (!jsonData) return
    setError(null)
    setApplyMensaje(null)
    try {
      const resp = await applyMut.mutateAsync(jsonData)
      setPreview(resp.data.preview)
      setApplyMensaje(resp.data.mensaje)
      if (resp.data.aplicado) {
        // Limpiamos el archivo después de un apply exitoso.
        setJsonData(null)
        setFileName(null)
        if (inputRef.current) inputRef.current.value = ""
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Importar planilla desde JSON
          </SheetTitle>
          <SheetDescription>
            Subí un archivo <code className="text-xs">.planilla.json</code> exportado desde
            otra instalación. Si el código + versión ya existen, se autogenera una versión
            sufijada para evitar colisiones.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 px-4 pb-8 space-y-5">
          {/* Paso 1: archivo */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paso 1 — Subir archivo
            </p>
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                onChange={handlePickFile}
                className="text-sm file:mr-3 file:rounded file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
              />
              {fileName && (
                <Button variant="ghost" size="sm" onClick={reset}>
                  Quitar
                </Button>
              )}
            </div>
          </div>

          {/* Paso 2: preview */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paso 2 — Previsualizar
            </p>
            <Button
              size="sm"
              onClick={handlePreview}
              disabled={!jsonData || previewMut.isPending}
              className="gap-2"
            >
              {previewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Previsualizar
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen del preview */}
          {preview && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Planilla:</span>{" "}
                  <strong>{preview.nombre}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Código:</span>{" "}
                  <code className="font-mono text-blue-700">{preview.codigoAplicar}</code>
                  {preview.codigoAplicar !== preview.codigoOriginal && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (original: {preview.codigoOriginal})
                    </span>
                  )}
                </p>
                <p>
                  <span className="text-muted-foreground">Versión:</span>{" "}
                  <code className="font-mono">{preview.versionAplicar}</code>
                  {preview.versionAplicar !== preview.versionOriginal && (
                    <span className="ml-2 text-xs text-amber-700">
                      (autogenerada — la versión '{preview.versionOriginal}' ya existe)
                    </span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded border p-2">
                  <p className="text-xs text-muted-foreground">Secciones</p>
                  <p className="font-medium">+{preview.seccionesACrear}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-xs text-muted-foreground">PlanillaCampos</p>
                  <p className="font-medium">+{preview.planillaCamposACrear}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-xs text-muted-foreground">Campos nuevos</p>
                  <p className="font-medium text-green-700">+{preview.camposNuevos}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-xs text-muted-foreground">Campos reusados del catálogo</p>
                  <p className="font-medium text-blue-700">{preview.camposReusados}</p>
                </div>
              </div>

              {preview.conflictos.length > 0 ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-700 flex items-center gap-1.5 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    {preview.conflictos.length} conflicto{preview.conflictos.length !== 1 ? "s" : ""}
                  </p>
                  <ul className="space-y-1 text-xs text-red-700 list-disc list-inside">
                    {preview.conflictos.map((c, i) => (
                      <li key={i}>{c.mensaje}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Sin conflictos. Lista para importar.
                </p>
              )}
            </div>
          )}

          {/* Paso 3: aplicar */}
          {preview && preview.esAplicable && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paso 3 — Aplicar
              </p>
              <Button
                onClick={handleApply}
                disabled={applyMut.isPending}
                className="gap-2 bg-blue-900 hover:bg-blue-800"
              >
                {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Importar planilla
              </Button>
            </div>
          )}

          {applyMensaje && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              {applyMensaje}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
