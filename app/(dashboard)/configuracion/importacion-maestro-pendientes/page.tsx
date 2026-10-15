"use client"

import { useRef, useState } from "react"
import {
  AlertCircle, CheckCircle2, Download, FileSpreadsheet, ListChecks, Loader2, Play, Upload,
} from "lucide-react"

import {
  useApplyImportCatalogo,
  usePreviewImportCatalogo,
} from "@/features/pendientes/api/use-catalogo-maestro"
import type {
  PendienteCatalogoImportResult,
  PendienteCatalogoImportResumen,
} from "@/features/pendientes/types"

import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export default function ImportacionMaestroPendientesPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<PendienteCatalogoImportResult | null>(null)
  const [applyMensaje, setApplyMensaje] = useState<string | null>(null)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewMut = usePreviewImportCatalogo()
  const applyMut = useApplyImportCatalogo()

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
      setPreview(resp)
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
      setPreview(resp)
      setApplyMensaje(resp.mensaje)
      if (resp.aplicado) {
        setArchivo(null)
        if (inputRef.current) inputRef.current.value = ""
      }
    } catch (e) {
      setErrorGlobal((e as Error).message)
    }
  }

  function descargarPlantilla() {
    const a = document.createElement("a")
    a.href = "/api/pendientes-catalogo/import/plantilla"
    a.download = ""
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Un preview "es aplicable" si no tiene errores y tiene al menos una op.
  const totalOps = preview
    ? preview.tipos.total + preview.acciones.total + preview.motivos.total + preview.catalogo.total
    : 0
  const esAplicable = !!preview && preview.errores.length === 0 && totalOps > 0

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ListChecks className="h-6 w-6 text-blue-700" />
          Exportar / Importar catálogo maestro de pendientes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cuatro hojas: <strong>Tipos</strong>, <strong>Acciones</strong>, <strong>Motivos</strong> y{" "}
          <strong>Catalogo</strong> (combinación Nivel + Especialidad + Tipo + AccionPendiente + Motivo →
          Descripción + Categoría). Cada fila lleva una columna <code className="text-xs">Accion</code>{" "}
          (CREATE / UPDATE / DELETE / SKIP). Nivel y Categoría no se crean desde acá — deben pre-existir.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Paso 1 — Descargar plantilla
          </CardTitle>
          <CardDescription>
            Bajá un Excel con los datos actuales del tenant. Las filas vienen con{" "}
            <code className="text-xs">Accion=SKIP</code>. Cambiala a CREATE / UPDATE / DELETE en las
            que quieras tocar. El match es por nombre (case-insensitive).
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
            {archivo && <Button variant="ghost" size="sm" onClick={reset}>Quitar</Button>}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ResumenCard titulo="Tipos"    resumen={preview.tipos} />
              <ResumenCard titulo="Acciones" resumen={preview.acciones} />
              <ResumenCard titulo="Motivos"  resumen={preview.motivos} />
              <ResumenCard titulo="Catálogo" resumen={preview.catalogo} />
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
                      <TableHead className="w-32">Hoja</TableHead>
                      <TableHead className="w-20">Fila</TableHead>
                      <TableHead className="w-44">Columna</TableHead>
                      <TableHead>Mensaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.errores.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{e.hoja}</TableCell>
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
              <Button onClick={handleApply} disabled={!esAplicable || applyMut.isPending || !archivo} className="gap-2">
                {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Aplicar importación
              </Button>
              {!esAplicable && preview.errores.length === 0 && (
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

function ResumenCard({ titulo, resumen }: { titulo: string; resumen: PendienteCatalogoImportResumen }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="text-green-700">+{resumen.creates}</span>
        <span className="text-blue-700">~{resumen.updates}</span>
        <span className="text-red-700">−{resumen.deletes}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Total: {resumen.total}</p>
    </div>
  )
}
