"use client"

import { useRef, useState } from "react"
import { Loader2, Download, Upload, AlertTriangle, CheckCircle2, FileJson } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  exportarTodasLasPlanillas,
  parseFileJson,
  useImportPlanillasAllPreview,
  useImportPlanillasAllApply,
} from "@/features/planillas/api/use-import-export"

export default function PlanillasExportImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<unknown | null>(null)
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [omitirExistentes, setOmitirExistentes] = useState(true)

  const previewMut = useImportPlanillasAllPreview()
  const applyMut = useImportPlanillasAllApply()

  const preview = previewMut.data?.data
  const resultado = applyMut.data?.data

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    applyMut.reset()
    previewMut.reset()
    try {
      const json = await parseFileJson<unknown>(file)
      setData(json)
      previewMut.mutate(json)
    } catch (err) {
      setData(null)
      setParseError(err instanceof Error ? err.message : "Archivo inválido.")
    }
  }

  function reset() {
    setData(null)
    setFileName("")
    setParseError(null)
    previewMut.reset()
    applyMut.reset()
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <FileJson className="h-6 w-6 text-blue-700" />
          Exportar / Importar planillas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Migrá todas las planillas entre ambientes en un solo archivo JSON (incluye imágenes y tablas).
        </p>
      </div>

      {/* Export */}
      <Card className="p-6 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800">Exportar todas</h2>
          <p className="text-sm text-muted-foreground">
            Descarga un JSON con todas las planillas activas, sus campos, opciones, tablas e imágenes (base64).
          </p>
        </div>
        <Button onClick={exportarTodasLasPlanillas} className="gap-2">
          <Download className="h-4 w-4" /> Exportar todas las planillas
        </Button>
      </Card>

      {/* Import */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Importar</h2>
          <p className="text-sm text-muted-foreground">
            Subí un archivo exportado. Se previsualiza antes de aplicar. Las planillas se crean nuevas
            (si el código+versión ya existe, se sufija la versión); los campos se reusan por código.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={onFile}
            className="hidden"
          />
          <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Elegir archivo
          </Button>
          {fileName && <span className="text-sm text-muted-foreground truncate">{fileName}</span>}
          {(data || parseError) && (
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
              Limpiar
            </Button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={omitirExistentes}
            onChange={(e) => setOmitirExistentes(e.target.checked)}
          />
          Omitir las que ya existen (mismo código y versión)
        </label>

        {parseError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{parseError}</p>
          </div>
        )}

        {previewMut.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Validando archivo…
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{preview.totalPlanillas}</strong> planilla(s) en el archivo.
            </p>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {preview.planillas.map((p, i) => (
                <li
                  key={i}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    p.esAplicable ? "border-gray-200 bg-white" : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {p.nombre} <span className="font-mono text-gray-500">({p.codigoAplicar} v{p.versionAplicar})</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      {p.yaExiste && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            omitirExistentes ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {omitirExistentes ? "se omitirá" : "ya existe"}
                        </span>
                      )}
                      {p.esAplicable ? (
                        <span className="text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      ) : (
                        <span className="text-destructive inline-flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Conflicto
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    Campos nuevos: {p.camposNuevos} · reusados: {p.camposReusados} · secciones: {p.seccionesACrear}
                  </p>
                  {p.conflictos
                    .filter((c) => c.severidad === "error")
                    .map((c, j) => (
                      <p key={j} className="text-destructive mt-0.5">{c.mensaje}</p>
                    ))}
                </li>
              ))}
            </ul>

            {!resultado && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => data && applyMut.mutate({ data, omitirExistentes })}
                  disabled={!preview.esAplicable || applyMut.isPending}
                  className="gap-2"
                >
                  {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Importar {omitirExistentes ? preview.planillas.filter((p) => !p.yaExiste).length : preview.totalPlanillas} planilla(s)
                </Button>
                {!preview.esAplicable && (
                  <span className="text-xs text-destructive">Resolvé los conflictos antes de importar.</span>
                )}
              </div>
            )}
          </div>
        )}

        {applyMut.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              No se pudo importar.
              {applyMut.error instanceof Error ? ` ${applyMut.error.message}` : ""}
            </p>
          </div>
        )}

        {resultado && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{resultado.mensaje}</p>
            </div>
            {resultado.resultados.filter((r) => !r.aplicado && !r.omitida).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-destructive">
                  Planillas que fallaron ({resultado.resultados.filter((r) => !r.aplicado && !r.omitida).length}):
                </p>
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {resultado.resultados
                    .filter((r) => !r.aplicado && !r.omitida)
                    .map((r, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                      >
                        {r.mensaje}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {resultado.resultados.filter((r) => r.omitida).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-amber-700">
                  Omitidas por ya existir ({resultado.resultados.filter((r) => r.omitida).length}):
                </p>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {resultado.resultados
                    .filter((r) => r.omitida)
                    .map((r, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                      >
                        {r.mensaje}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
