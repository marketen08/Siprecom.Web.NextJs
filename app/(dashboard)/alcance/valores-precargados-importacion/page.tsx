"use client"

import { useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Play,
  Sparkles,
  Upload,
} from "lucide-react"

import {
  descargarPlantillaValoresPrecargados,
  useImportValoresPrecargadosApply,
  useImportValoresPrecargadosPreview,
} from "@/features/importacion/api/use-import-valores-precargados"
import type {
  ImportEntidadResumen,
  ImportError,
  ImportValoresPrecargadosPreview,
} from "@/features/importacion/types"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetTareasSelect } from "@/features/tareas/api/use-get-tareas-select"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

export default function ImportacionValoresPrecargadosPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportValoresPrecargadosPreview | null>(null)
  const [applyMensaje, setApplyMensaje] = useState<string | null>(null)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const [subSistemaId, setSubSistemaId] = useState<string>(ALL)
  const [tareaId, setTareaId] = useState<string>(ALL)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewMut = useImportValoresPrecargadosPreview()
  const applyMut = useImportValoresPrecargadosApply()

  const { data: subSistemasRaw } = useGetSubSistemasSelect()
  const { data: tareasRaw } = useGetTareasSelect()
  const subSistemas: Array<{ id: string; codigo: string; nombre: string }> =
    (subSistemasRaw as any)?.data ?? []
  const tareas: Array<{ id: string; nombre: string }> = (tareasRaw as any)?.data ?? []

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

  function handleDescargar() {
    descargarPlantillaValoresPrecargados({
      subSistemaId: subSistemaId === ALL ? null : subSistemaId,
      tareaId: tareaId === ALL ? null : tareaId,
    })
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
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          Importar valores precargados
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cargá masivamente los valores precargados por elemento desde un Excel.
          Una fila por elemento, una columna por campo. Celda vacía = no tocar;
          escribir <code className="text-xs bg-gray-100 px-1 rounded">_BORRAR_</code> elimina el valor existente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Paso 1 — Descargar plantilla
          </CardTitle>
          <CardDescription>
            Bajá un Excel con los elementos del proyecto y los valores actuales pre-llenados.
            Filtrá por subsistema o tarea para reducir el tamaño del archivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Subsistema
              </label>
              <Select value={subSistemaId} onValueChange={(v) => setSubSistemaId(v ?? ALL)}>
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {subSistemaId === ALL
                      ? "Todos"
                      : subSistemas.find((s) => s.id === subSistemaId)?.nombre ?? "—"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {subSistemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.codigo} — {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Tarea
              </label>
              <Select value={tareaId} onValueChange={(v) => setTareaId(v ?? ALL)}>
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {tareaId === ALL
                      ? "Todas"
                      : tareas.find((t) => t.id === tareaId)?.nombre ?? "—"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {tareas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleDescargar} className="gap-2">
            <Download className="h-4 w-4" />
            Descargar plantilla
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
            Subí el archivo editado. Vas a ver un resumen de los valores que se van a
            actualizar/borrar y los errores. No se aplica nada hasta que confirmes.
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
              Cambios que se van a aplicar si confirmás.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ResumenCard
                titulo="Valores precargados"
                resumen={preview.valoresPrecargados}
              />
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Elementos afectados
                </p>
                <p className="mt-2 text-2xl font-semibold">{preview.elementosAfectados}</p>
              </div>
            </div>

            {preview.errores.length > 0 ? (
              <ErroresTabla errores={preview.errores} />
            ) : preview.esAplicable ? (
              <p className="text-sm text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Sin errores. El archivo está listo para aplicar.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                El archivo no contiene cambios para aplicar.
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
            </div>

            {applyMensaje && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                {applyMensaje}
              </p>
            )}
          </CardContent>
        </Card>
      )}
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
        <span className="text-blue-700" title="Updates (set valor)">~{resumen.updates}</span>
        <span className="text-red-700" title="Deletes (_BORRAR_)">−{resumen.deletes}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Total: {resumen.total}</p>
    </div>
  )
}

function ErroresTabla({ errores }: { errores: ImportError[] }) {
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
            <TableHead className="w-20">Fila</TableHead>
            <TableHead className="w-40">Columna</TableHead>
            <TableHead>Mensaje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errores.map((e, i) => (
            <TableRow key={i}>
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
