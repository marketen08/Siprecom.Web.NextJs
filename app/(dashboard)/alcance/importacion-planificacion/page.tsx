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
  descargarPlantillaPlanificacion,
  useImportPlanificacionApply,
  useImportPlanificacionPreview,
} from "@/features/importacion/api/use-import-planificacion"
import type { ImportPlanificacionPreview } from "@/features/importacion/types"

import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export default function ImportacionPlanificacionPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPlanificacionPreview | null>(null)
  const [applyMensaje, setApplyMensaje] = useState<string | null>(null)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewMut = useImportPlanificacionPreview()
  const applyMut = useImportPlanificacionApply()

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setArchivo(e.target.files?.[0] ?? null)
    setPreview(null)
    setApplyMensaje(null)
    setErrorGlobal(null)
  }

  function reset() {
    setArchivo(null)
    setPreview(null)
    setApplyMensaje(null)
    setErrorGlobal(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handlePreview() {
    if (!archivo) return
    setApplyMensaje(null)
    setErrorGlobal(null)
    try {
      const resp = await previewMut.mutateAsync(archivo)
      setPreview(resp.data)
    } catch (e) {
      setErrorGlobal((e as Error).message)
    }
  }

  async function handleApply() {
    if (!archivo) return
    setApplyMensaje(null)
    setErrorGlobal(null)
    try {
      const resp = await applyMut.mutateAsync(archivo)
      setPreview(resp.data.preview)
      setApplyMensaje(resp.data.mensaje)
      if (resp.data.aplicado) {
        setArchivo(null)
        if (inputRef.current) inputRef.current.value = ""
      }
    } catch (e) {
      setErrorGlobal((e as Error).message)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar planificación</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Carga masiva de la planificación por nivel de los subsistemas (ventanas Fecha Inicio /
          Fecha Fin) desde un archivo Excel. El subsistema se referencia por <strong>código</strong> y
          el nivel por <strong>nombre</strong>. Soporta crear, modificar y eliminar ventanas en una
          sola operación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Paso 1 — Descargar plantilla
          </CardTitle>
          <CardDescription>
            Bajá un Excel con la grilla SubSistema × Nivel del proyecto, pre-cargada con las ventanas
            actuales. Las filas vienen marcadas como SKIP. Cambiá <code className="text-xs">Accion</code> a
            CREATE / UPDATE (cargar o pisar fechas) o DELETE (borrar la ventana) según corresponda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={descargarPlantillaPlanificacion} className="gap-2">
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
            Subí el archivo editado. Vas a ver el resumen de qué se va a crear, actualizar y eliminar,
            y los errores si los hay. No se aplica nada hasta que confirmes.
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
              <Button variant="ghost" size="sm" onClick={reset}>Quitar</Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePreview} disabled={!archivo || previewMut.isPending} className="gap-2">
              {previewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
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

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>Operaciones que se van a aplicar si confirmás.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3 max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planificación</p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="text-green-700">+{preview.planificacion.creates}</span>
                <span className="text-blue-700">~{preview.planificacion.updates}</span>
                <span className="text-red-700">−{preview.planificacion.deletes}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total: {preview.planificacion.total}</p>
            </div>

            {preview.errores.length > 0 ? (
              <div className="rounded-md border">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-700">
                    {preview.errores.length} error{preview.errores.length !== 1 ? "es" : ""} —
                    el archivo no se puede aplicar hasta que los corrijas.
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Fila</TableHead>
                      <TableHead className="w-40">Columna</TableHead>
                      <TableHead>Mensaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.errores.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{e.filaExcel}</TableCell>
                        <TableCell className="font-mono text-xs">{e.columna ?? "—"}</TableCell>
                        <TableCell className="text-sm">{e.mensaje}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Sin errores. El archivo está listo para aplicar.
              </p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleApply} disabled={!preview.esAplicable || applyMut.isPending || !archivo} className="gap-2">
                {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Aplicar importación
              </Button>
              {!preview.esAplicable && preview.errores.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No hay operaciones a aplicar (todas las filas están en SKIP).
                </span>
              )}
            </div>

            {applyMensaje && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">{applyMensaje}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
