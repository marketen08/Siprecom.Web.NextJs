"use client"

import { useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Play,
  Upload,
} from "lucide-react"

import {
  descargarPlantilla,
  useImportApply,
  useImportPreview,
  useImportStatus,
} from "@/features/importacion/api/use-import"
import type { ImportEntidadResumen, ImportPreview } from "@/features/importacion/types"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function ImportacionPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewMut = useImportPreview()
  const applyMut = useImportApply()
  const status = useImportStatus(jobId)
  const job = status.data?.data ?? null

  const terminado = job?.estadoTexto === "Completado"
                 || job?.estadoTexto === "Fallido"
                 || job?.estadoTexto === "CanceladoPorError"

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setArchivo(file)
    setPreview(null)
    setErrorGlobal(null)
    setJobId(null)
  }

  function reset() {
    setArchivo(null)
    setPreview(null)
    setErrorGlobal(null)
    setJobId(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handlePreview() {
    if (!archivo) return
    setErrorGlobal(null)
    setJobId(null)
    try {
      const resp = await previewMut.mutateAsync(archivo)
      setPreview(resp.data)
    } catch (e) {
      setErrorGlobal((e as Error).message)
    }
  }

  async function handleApply() {
    if (!archivo) return
    setErrorGlobal(null)
    try {
      const resp = await applyMut.mutateAsync(archivo)
      // Iniciamos el polling — la UI muestra progreso hasta que el job termine.
      setJobId(resp.data.jobId)
    } catch (e) {
      setErrorGlobal((e as Error).message)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar datos del proyecto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importá sistemas, subsistemas y elementos desde un archivo Excel. Soporta crear,
          modificar y eliminar en una sola operación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Paso 1 — Descargar plantilla
          </CardTitle>
          <CardDescription>
            Bajá un Excel con el estado actual del proyecto. Las filas vienen marcadas como
            SKIP (no se tocan). Cambiá la columna <code className="text-xs">Accion</code> a
            CREATE / UPDATE / DELETE según corresponda, y agregá filas nuevas para crear más.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={descargarPlantilla} className="gap-2">
            <Download className="h-4 w-4" />
            Descargar plantilla actual
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Paso 2 — Subir y previsualizar
          </CardTitle>
          <CardDescription>
            Subí el archivo editado. Vas a ver un resumen de qué se va a crear, actualizar
            y eliminar, y los errores si los hay. No se aplica nada hasta que confirmes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              onChange={onPickFile}
              className="text-sm file:mr-3 file:rounded file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
            />
            {archivo && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Quitar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePreview}
              disabled={!archivo || previewMut.isPending}
              className="gap-2"
            >
              {previewMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Previsualizar
            </Button>
          </div>

          {errorGlobal && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorGlobal}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && !jobId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              Operaciones que se van a aplicar si confirmás.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResumenGrid preview={preview} />
            {preview.errores.length > 0 ? (
              <ErroresTabla errores={preview.errores} totalErrores={preview.totalErrores} />
            ) : (
              <p className="text-sm text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Sin errores. El archivo está listo para aplicar.
              </p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleApply}
                disabled={!preview.esAplicable || applyMut.isPending || !archivo}
                className="gap-2"
              >
                {applyMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Aplicar importación
              </Button>
              {!preview.esAplicable && preview.totalErrores === 0 && (
                <span className="text-xs text-muted-foreground">
                  No hay operaciones a aplicar (todas las filas están en SKIP).
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {jobId && job && (
        <ProgresoCard
          job={job}
          onReintentar={() => { setJobId(null); setPreview(null) }}
          onCerrar={reset}
          terminado={terminado}
        />
      )}
    </div>
  )
}

function ProgresoCard({
  job, onReintentar, onCerrar, terminado,
}: {
  job: NonNullable<ReturnType<typeof useImportStatus>["data"]>["data"]
  onReintentar: () => void
  onCerrar: () => void
  terminado: boolean
}) {
  const fallido = job.estadoTexto === "Fallido" || job.estadoTexto === "CanceladoPorError"
  const completado = job.estadoTexto === "Completado"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {completado ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : fallido ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {completado ? "Import completado" : fallido ? "Import fallido" : "Import en progreso"}
        </CardTitle>
        <CardDescription>{textoEstado(job.estadoTexto)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!terminado && (
          <>
            <div>
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="text-muted-foreground">{job.mensajeActual}</span>
                <span className="tabular-nums font-medium">{job.porcentajeAvance}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${job.porcentajeAvance}%` }}
                />
              </div>
              {job.totalFilas > 0 && (
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {job.filasProcesadas.toLocaleString("es-AR")} / {job.totalFilas.toLocaleString("es-AR")} filas
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Podés dejar esta pantalla abierta o volver más tarde — el proceso corre en el servidor.
            </p>
          </>
        )}

        {job.preview && (
          <ResumenGrid preview={job.preview} />
        )}

        {completado && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
            {job.mensajeFinal ?? "Importación aplicada."}
            {job.duracionMs != null && (
              <span className="block text-xs text-green-600/80 mt-1">
                Duración total: {formatDuracion(job.duracionMs)}.
              </span>
            )}
          </p>
        )}
        {fallido && (
          <pre className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 whitespace-pre-wrap wrap-break-word">
            {job.error ?? "Error desconocido"}
          </pre>
        )}

        {job.timings.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
              Diagnóstico ({job.timings.length} fases · {formatDuracion(job.duracionMs ?? 0)})
            </summary>
            <div className="mt-2 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fase</TableHead>
                    <TableHead className="w-24 text-right">Filas</TableHead>
                    <TableHead className="w-24 text-right">Duración</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.timings.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{t.fase}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {t.filasProcesadas?.toLocaleString("es-AR") ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatDuracion(t.milisegundosTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        )}

        {terminado && (
          <div className="flex items-center gap-2 pt-2">
            {fallido && (
              <Button variant="outline" size="sm" onClick={onReintentar}>
                Volver al preview
              </Button>
            )}
            <Button size="sm" onClick={onCerrar}>
              {completado ? "Nueva importación" : "Cerrar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function textoEstado(estado: string): string {
  const map: Record<string, string> = {
    Encolado: "En cola…",
    Parseando: "Leyendo archivo Excel…",
    Validando: "Validando datos contra el proyecto…",
    AplicandoSistemas: "Aplicando sistemas…",
    AplicandoSubsistemas: "Aplicando subsistemas…",
    AplicandoElementos: "Aplicando elementos (la fase más pesada)…",
    SincronizandoTareas: "Generando tareas para los nuevos elementos…",
    SincronizandoDependencias: "Materializando dependencias entre tareas…",
    VinculandoModelo3D: "Vinculando elementos con la maqueta 3D…",
    Completado: "Todo aplicado en la base.",
    Fallido: "El proceso se detuvo con un error.",
    CanceladoPorError: "El proceso se detuvo por errores de validación.",
  }
  return map[estado] ?? estado
}

function formatDuracion(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)} s`
  const m = Math.floor(s / 60)
  const sr = Math.round(s - m * 60)
  return `${m}m ${sr.toString().padStart(2, "0")}s`
}

function ResumenGrid({ preview }: { preview: ImportPreview }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <ResumenCard titulo="Sistemas" resumen={preview.sistemas} />
      <ResumenCard titulo="Subsistemas" resumen={preview.subsistemas} />
      <ResumenCard titulo="Elementos" resumen={preview.elementos} />
    </div>
  )
}

function ResumenCard({ titulo, resumen }: { titulo: string; resumen: ImportEntidadResumen }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </p>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="text-green-700">+{resumen.creates}</span>
        <span className="text-blue-700">~{resumen.updates}</span>
        <span className="text-red-700">−{resumen.deletes}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Total: {resumen.total}</p>
    </div>
  )
}

function ErroresTabla({
  errores, totalErrores,
}: {
  errores: ImportPreview["errores"]
  totalErrores: number
}) {
  const mostrados = errores.length
  const total = totalErrores || mostrados
  const truncado = total > mostrados
  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <p className="text-sm font-medium text-red-700">
          {total.toLocaleString("es-AR")} error{total !== 1 ? "es" : ""} — el archivo no se puede aplicar hasta que los corrijas.
          {truncado && (
            <span className="ml-1 font-normal text-red-600/80">
              (mostrando los primeros {mostrados})
            </span>
          )}
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Hoja</TableHead>
            <TableHead className="w-20">Fila</TableHead>
            <TableHead className="w-40">Columna</TableHead>
            <TableHead>Mensaje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errores.map((e, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{e.hoja}</TableCell>
              <TableCell className="font-mono text-xs">{e.filaExcel}</TableCell>
              <TableCell className="font-mono text-xs">{e.columna ?? "—"}</TableCell>
              <TableCell className="text-sm">{e.mensaje}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
