"use client"

import { useRef, useState, type ReactNode } from "react"
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Play, Upload } from "lucide-react"
import type { UseMutationResult } from "@tanstack/react-query"

import type { ImportPreview, ImportResultado } from "@/features/soldadura/types"
import { Encabezado, usePermisosSoldadura } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Carga masiva desde Excel con el patrón de toda la plataforma: plantilla con lo que
 * ya existe → vista previa con errores por fila → aplicar todo o nada. Lo comparten
 * los dos importadores del módulo (catálogos y juntas); cambia solo el texto, los
 * nombres de las hojas y los hooks.
 */
export function ImportadorExcel({
  titulo, descripcion, ayudaPlantilla, hojas, descargar, preview, apply,
}: {
  titulo: string
  descripcion: ReactNode
  ayudaPlantilla: ReactNode
  /** Nombre legible de cada hoja. Las claves son las del backend. */
  hojas: Record<string, string>
  descargar: () => void
  preview: UseMutationResult<ImportPreview, Error, File>
  apply: UseMutationResult<ImportResultado, Error, File>
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState<ImportPreview | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const { parametros } = usePermisosSoldadura()

  const total = vista ? Object.values(vista.hojas).reduce((s, h) => s + h.total, 0) : 0
  const aplicable = !!vista && vista.errores.length === 0 && total > 0

  function limpiar(todo: boolean) {
    setVista(null)
    setMensaje(null)
    setError(null)
    if (todo) {
      setArchivo(null)
      if (input.current) input.current.value = ""
    }
  }

  async function previsualizar() {
    if (!archivo) return
    limpiar(false)
    try { setVista(await preview.mutateAsync(archivo)) } catch (e) { setError((e as Error).message) }
  }

  async function aplicar() {
    if (!archivo) return
    setMensaje(null)
    setError(null)
    try {
      const r = await apply.mutateAsync(archivo)
      setVista(r.preview)
      if (r.aplicado) {
        setMensaje(r.mensaje)
        setArchivo(null)
        if (input.current) input.current.value = ""
      } else {
        setError(r.mensaje)
      }
    } catch (e) { setError((e as Error).message) }
  }

  if (!parametros) {
    return <Encabezado titulo={titulo} descripcion="La importación masiva la hace un Supervisor o un Administrador del proyecto." />
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Encabezado titulo={titulo} descripcion={descripcion} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Paso 1 — Descargar la plantilla</CardTitle>
          <CardDescription>{ayudaPlantilla}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" className="gap-2" onClick={descargar}>
            <Download className="h-4 w-4" /> Descargar plantilla
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Paso 2 — Subir y revisar</CardTitle>
          <CardDescription>No se aplica nada hasta que confirmes. Si hay un solo error, no se aplica ninguna fila.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              ref={input} type="file" accept=".xlsx"
              onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); limpiar(false) }}
              className="text-sm file:mr-3 file:rounded file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
            />
            {archivo && <Button variant="ghost" size="sm" onClick={() => limpiar(true)}>Quitar</Button>}
          </div>
          <Button size="sm" className="gap-2" onClick={previsualizar} disabled={!archivo || preview.isPending}>
            {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Previsualizar
          </Button>
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span className="whitespace-pre-line">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {vista && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa</CardTitle>
            <CardDescription>Lo que se va a aplicar, hoja por hoja, en este orden.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(vista.hojas).map(([hoja, r]) => (
                <div key={hoja} className={`rounded-md border p-3 ${r.total === 0 ? "opacity-60" : ""}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{hojas[hoja] ?? hoja}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-sm tabular-nums">
                    <span className="text-green-700" title="Altas">+{r.creates}</span>
                    <span className="text-blue-700" title="Modificaciones">~{r.updates}</span>
                    <span className="text-red-700" title="Bajas">−{r.deletes}</span>
                  </div>
                </div>
              ))}
            </div>

            {vista.errores.length > 0 ? (
              <div className="rounded-md border">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-700">
                    {vista.errores.length} error{vista.errores.length !== 1 ? "es" : ""}: el archivo no se puede aplicar hasta que se corrijan.
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Hoja</TableHead>
                      <TableHead className="w-16">Fila</TableHead>
                      <TableHead className="w-40">Columna</TableHead>
                      <TableHead>Mensaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vista.errores.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{hojas[e.hoja] ?? e.hoja}</TableCell>
                        <TableCell className="font-mono text-xs">{e.filaExcel || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{e.columna ?? "—"}</TableCell>
                        <TableCell className="text-sm">{e.mensaje}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : total > 0 ? (
              <p className="text-sm text-green-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Sin errores. Listo para aplicar.</p>
            ) : (
              <p className="text-sm text-muted-foreground">El archivo no tiene filas para aplicar: todas están en SKIP o vacías.</p>
            )}

            <Button className="gap-2" onClick={aplicar} disabled={!aplicable || !archivo || apply.isPending}>
              {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Aplicar importación
            </Button>
            {mensaje && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">{mensaje}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
