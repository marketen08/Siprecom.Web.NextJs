"use client"

import { useRef, useState } from "react"
import { Loader2, Download, Upload, AlertTriangle, CheckCircle2, FileText } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  exportarTodosLosProcedimientos,
  parseFileJson,
  useImportProcedimientosPreview,
  useImportProcedimientosApply,
  type ProcedimientoModo,
} from "@/features/procedimientos/api/use-import-export"

const MODOS: { value: ProcedimientoModo; label: string; help: string }[] = [
  { value: "omitir", label: "Omitir los que ya existen", help: "Saltea los procedimientos cuyo nombre ya existe." },
  { value: "reemplazar", label: "Reemplazar los que ya existen", help: "Actualiza datos y PDF del existente (conserva el vínculo con las tareas)." },
]

export default function ProcedimientosExportImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<unknown | null>(null)
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [modo, setModo] = useState<ProcedimientoModo>("omitir")

  const previewMut = useImportProcedimientosPreview()
  const applyMut = useImportProcedimientosApply()

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

      // Validación local: la deserialización de .NET es case-insensitive pero exige
      // que la propiedad exista con el nombre correcto. Chequeamos formato mínimo
      // para dar un error claro antes de mandarlo al backend.
      const obj = json as Record<string, unknown> | null
      const procs = obj?.procedimientos ?? obj?.Procedimientos
      if (!Array.isArray(procs)) {
        setData(null)
        setParseError(
          "El JSON no tiene la propiedad 'procedimientos'. ¿Es un archivo exportado desde esta pantalla?",
        )
        return
      }
      if (procs.length === 0) {
        setData(null)
        setParseError("El archivo no contiene procedimientos.")
        return
      }

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

  const yaExistenCount = preview?.procedimientos.filter((p) => p.yaExiste).length ?? 0

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <FileText className="h-6 w-6 text-blue-700" />
          Exportar / Importar procedimientos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Migrá los procedimientos (con su PDF) entre ambientes en un solo archivo JSON.
        </p>
      </div>

      {/* Export */}
      <Card className="p-6 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800">Exportar todos</h2>
          <p className="text-sm text-muted-foreground">
            Descarga un JSON con todos los procedimientos activos y sus PDF embebidos (base64).
          </p>
        </div>
        <Button onClick={exportarTodosLosProcedimientos} className="gap-2">
          <Download className="h-4 w-4" /> Exportar todos los procedimientos
        </Button>
      </Card>

      {/* Import */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Importar</h2>
          <p className="text-sm text-muted-foreground">
            Subí un archivo exportado. Se matchean por <strong>nombre</strong>; los PDF se re-suben al storage del destino.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} className="hidden" />
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

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600">Qué hacer con los que ya existen:</p>
          <div className="space-y-1">
            {MODOS.map((m) => (
              <label key={m.value} className="flex items-start gap-2 cursor-pointer rounded-md px-1 py-0.5 hover:bg-gray-50">
                <input
                  type="radio"
                  name="modo-proc"
                  className="mt-0.5 h-4 w-4"
                  checked={modo === m.value}
                  onChange={() => setModo(m.value)}
                />
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
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{parseError}</p>
          </div>
        )}

        {previewMut.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Validando archivo…
          </div>
        )}

        {previewMut.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">No se pudo validar el archivo.</p>
              <p className="text-xs whitespace-pre-wrap">
                {previewMut.error instanceof Error ? previewMut.error.message : "Error inesperado."}
              </p>
            </div>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{preview.total}</strong> procedimiento(s) en el archivo
              {yaExistenCount > 0 && <span className="text-muted-foreground"> · {yaExistenCount} ya existe(n)</span>}.
            </p>
            <ul className="space-y-1 max-h-72 overflow-y-auto">
              {preview.procedimientos.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs">
                  <span className="font-medium truncate">{p.nombre}</span>
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    {!p.tieneArchivo && <span className="text-[10px] text-muted-foreground">sin PDF</span>}
                    {p.yaExiste && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${modo === "omitir" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"}`}>
                        {modo === "omitir" ? "se omitirá" : "se reemplazará"}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {!resultado && (
              <Button onClick={() => data && applyMut.mutate({ data, modo })} disabled={applyMut.isPending} className="gap-2">
                {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar
              </Button>
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
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{resultado.mensaje}</p>
            </div>
            {resultado.resultados.filter((r) => r.accion === "error").length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-destructive">
                  Con error ({resultado.resultados.filter((r) => r.accion === "error").length}):
                </p>
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {resultado.resultados
                    .filter((r) => r.accion === "error")
                    .map((r, i) => (
                      <li key={i} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
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
