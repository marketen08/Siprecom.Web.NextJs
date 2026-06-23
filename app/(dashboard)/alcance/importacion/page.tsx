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
  const [applyMensaje, setApplyMensaje] = useState<string | null>(null)
  const [applyOk, setApplyOk] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewMut = useImportPreview()
  const applyMut = useImportApply()

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setArchivo(file)
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
      setApplyOk(resp.data.aplicado)
      if (resp.data.aplicado) {
        // Limpiamos archivo después de un apply exitoso.
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

      {preview && (
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
              <ErroresTabla errores={preview.errores} />
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
              {!preview.esAplicable && preview.errores.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No hay operaciones a aplicar (todas las filas están en SKIP).
                </span>
              )}
            </div>

            {applyMensaje && (
              <p className={`text-sm border rounded-md p-3 ${
                applyOk
                  ? "text-green-700 bg-green-50 border-green-200"
                  : "text-red-700 bg-red-50 border-red-200"
              }`}>
                {applyMensaje}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
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

function ErroresTabla({ errores }: { errores: ImportPreview["errores"] }) {
  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <p className="text-sm font-medium text-red-700">
          {errores.length} error{errores.length !== 1 ? "es" : ""} — el archivo no se puede
          aplicar hasta que los corrijas.
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
