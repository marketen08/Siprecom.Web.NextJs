"use client"

import { useRef, useState } from "react"
import { Loader2, Download, Upload, AlertTriangle, CheckCircle2, FileJson } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import {
  exportarTodasLasPlanillas,
  parseFileJson,
  useImportPlanillasAllPreview,
  useImportPlanillasAllApply,
  type ImportModo,
} from "@/features/planillas/api/use-import-export"

const MODOS: { value: ImportModo; label: string; help: string; destructivo?: boolean }[] = [
  { value: "crear", label: "Crear (versionar si ya existe)", help: "Las que ya existen se importan como versión nueva (1.0-2, …)." },
  { value: "omitir", label: "Omitir las que ya existen", help: "Saltea las planillas con mismo código y versión." },
  { value: "reemplazar", label: "Reemplazar las que ya existen", help: "Pisa la definición existente. Falla si la planilla tiene registros cargados.", destructivo: true },
  { value: "eliminar-todas", label: "Eliminar TODAS y reimportar", help: "Borra todas las planillas de la base antes de importar. Falla si alguna tiene registros.", destructivo: true },
]

function badgeExistente(modo: ImportModo): string {
  switch (modo) {
    case "omitir": return "se omitirá"
    case "reemplazar": return "se reemplazará"
    case "eliminar-todas": return "se recreará"
    default: return "nueva versión"
  }
}

export default function PlanillasExportImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<unknown | null>(null)
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [modo, setModo] = useState<ImportModo>("omitir")

  const previewMut = useImportPlanillasAllPreview()
  const applyMut = useImportPlanillasAllApply()

  const preview = previewMut.data?.data
  const resultado = applyMut.data?.data
  const modoActual = MODOS.find((m) => m.value === modo)!

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

  async function doApply() {
    if (data) await applyMut.mutateAsync({ data, modo })
  }

  const yaExistenCount = preview?.planillas.filter((p) => p.yaExiste).length ?? 0
  const aImportar = preview
    ? modo === "omitir"
      ? preview.totalPlanillas - yaExistenCount
      : preview.totalPlanillas
    : 0
  const applyLabel =
    modo === "eliminar-todas"
      ? `Eliminar todo e importar ${preview?.totalPlanillas ?? 0}`
      : `Importar ${aImportar} planilla(s)`

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
            Subí un archivo exportado. Se previsualiza antes de aplicar. Los campos se reusan por código.
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

        {/* Modo de importación */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600">Qué hacer con las que ya existen:</p>
          <div className="space-y-1">
            {MODOS.map((m) => (
              <label key={m.value} className="flex items-start gap-2 cursor-pointer rounded-md px-1 py-0.5 hover:bg-gray-50">
                <input
                  type="radio"
                  name="modo-import"
                  className="mt-0.5 h-4 w-4"
                  checked={modo === m.value}
                  onChange={() => setModo(m.value)}
                />
                <span className="text-sm">
                  <span className={m.destructivo ? "font-medium text-red-700" : "font-medium"}>{m.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{m.help}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

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
              <strong>{preview.totalPlanillas}</strong> planilla(s) en el archivo
              {yaExistenCount > 0 && <span className="text-muted-foreground"> · {yaExistenCount} ya existe(n)</span>}.
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
                            modo === "omitir" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {badgeExistente(modo)}
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

            {modo === "eliminar-todas" && (
              <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Atención: se eliminarán <strong>TODAS</strong> las planillas de la base (no solo las del archivo)
                  antes de importar. Falla si alguna tiene registros cargados.
                </p>
              </div>
            )}

            {!resultado && (
              <div className="flex items-center gap-2">
                {!preview.esAplicable ? (
                  <Button disabled className="gap-2">
                    <Upload className="h-4 w-4" /> {applyLabel}
                  </Button>
                ) : modoActual.destructivo ? (
                  <ConfirmActionDialog
                    trigger={
                      <span className="inline-flex items-center gap-1.5">
                        <Upload className="h-4 w-4" /> {applyLabel}
                      </span>
                    }
                    triggerClassName="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                    title={modo === "eliminar-todas" ? "¿Eliminar TODAS las planillas?" : "¿Reemplazar las planillas existentes?"}
                    description={
                      modo === "eliminar-todas" ? (
                        <>Se borrarán <strong>todas</strong> las planillas de la base y luego se importarán las del archivo. No se puede deshacer. Falla si alguna tiene registros.</>
                      ) : (
                        <>Las planillas con el mismo código y versión se <strong>reemplazarán</strong> por las del archivo. Falla si alguna tiene registros cargados.</>
                      )
                    }
                    confirmText={modo === "eliminar-todas" ? "Eliminar todo e importar" : "Reemplazar"}
                    pendingText="Aplicando…"
                    variant="destructive"
                    confirmPhrase={modo === "eliminar-todas" ? "ELIMINAR TODAS" : undefined}
                    onConfirm={doApply}
                  />
                ) : (
                  <Button onClick={doApply} disabled={applyMut.isPending} className="gap-2">
                    {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {applyLabel}
                  </Button>
                )}
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
