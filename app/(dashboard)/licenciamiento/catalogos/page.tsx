"use client"

import { useRef, useState } from "react"
import { Loader2, Download, Upload, AlertTriangle, CheckCircle2, Tags } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  exportarCatalogos,
  parseFileJson,
  useImportCatalogosPreview,
  useImportCatalogosApply,
  type CatalogoModo,
} from "@/features/catalogos/api/use-import-export"

const MODOS: { value: CatalogoModo; label: string; help: string }[] = [
  { value: "omitir", label: "Omitir los que ya existen", help: "Saltea especialidades/tipos cuyo nombre ya existe." },
  { value: "reemplazar", label: "Reemplazar los que ya existen", help: "Actualiza los datos del existente (conserva el vínculo con tareas/elementos)." },
]

export default function CatalogosExportImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<unknown | null>(null)
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [modo, setModo] = useState<CatalogoModo>("omitir")

  const previewMut = useImportCatalogosPreview()
  const applyMut = useImportCatalogosApply()
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
          <Tags className="h-6 w-6 text-blue-700" />
          Exportar / Importar catálogos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Especialidades y Tipos de elemento (catálogos globales). Migralos a otro ambiente antes de
          importar las tareas, que los referencian.
        </p>
      </div>

      <Card className="p-6 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800">Exportar todos</h2>
          <p className="text-sm text-muted-foreground">Descarga un JSON con las especialidades y los tipos de elemento.</p>
        </div>
        <Button onClick={exportarCatalogos} className="gap-2">
          <Download className="h-4 w-4" /> Exportar catálogos
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Importar</h2>
          <p className="text-sm text-muted-foreground">
            Se matchean por <strong>nombre</strong>. Las especialidades se crean antes que los tipos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} className="hidden" />
          <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Elegir archivo
          </Button>
          {fileName && <span className="text-sm text-muted-foreground truncate">{fileName}</span>}
          {(data || parseError) && (
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">Limpiar</Button>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600">Qué hacer con los que ya existen:</p>
          <div className="space-y-1">
            {MODOS.map((m) => (
              <label key={m.value} className="flex items-start gap-2 cursor-pointer rounded-md px-1 py-0.5 hover:bg-gray-50">
                <input type="radio" name="modo-cat" className="mt-0.5 h-4 w-4" checked={modo === m.value} onChange={() => setModo(m.value)} />
                <span className="text-sm">
                  <span className="font-medium">{m.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{m.help}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <p>{parseError}</p>
          </div>
        )}

        {previewMut.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Validando…
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <p className="text-sm">
              Especialidades: <strong>{preview.especialidadesTotal}</strong> ({preview.especialidadesYaExisten} ya existen) ·
              Tipos: <strong>{preview.tiposTotal}</strong> ({preview.tiposYaExisten} ya existen).
            </p>
            {preview.conflictos.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-destructive">Conflictos ({preview.conflictos.length}):</p>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {preview.conflictos.map((c, i) => (
                    <li key={i} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {!resultado && (
              <div className="flex items-center gap-2">
                <Button onClick={() => data && applyMut.mutate({ data, modo })} disabled={!preview.esAplicable || applyMut.isPending} className="gap-2">
                  {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Importar catálogos
                </Button>
                {!preview.esAplicable && <span className="text-xs text-destructive">Resolvé los conflictos antes de importar.</span>}
              </div>
            )}
          </div>
        )}

        {applyMut.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>No se pudo importar.{applyMut.error instanceof Error ? ` ${applyMut.error.message}` : ""}</p>
          </div>
        )}

        {resultado && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <p>{resultado.mensaje}</p>
            </div>
            {resultado.errores.length > 0 && (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {resultado.errores.map((e, i) => (
                  <li key={i} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
