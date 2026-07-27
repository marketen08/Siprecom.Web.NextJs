"use client"

import { useMemo, useRef, useState } from "react"
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react"

import {
  useApplyImportCatalogo,
  usePreviewImportCatalogo,
} from "../api/use-catalogo-maestro"
import type { PendienteCatalogoImportResult } from "../types"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportCatalogoDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PendienteCatalogoImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<PendienteCatalogoImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewMut = usePreviewImportCatalogo()
  const applyMut = useApplyImportCatalogo()

  const reset = () => {
    setFile(null); setPreview(null); setApplied(null); setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const cerrar = () => { reset(); onOpenChange(false) }

  const onPickFile = async (f: File | null) => {
    setError(null); setPreview(null); setApplied(null)
    setFile(f)
    if (!f) return
    try { setPreview(await previewMut.mutateAsync(f)) }
    catch (e) { setError((e as Error).message) }
  }

  const aplicar = async () => {
    if (!file) return
    setError(null)
    try { setApplied(await applyMut.mutateAsync(file)) }
    catch (e) { setError((e as Error).message) }
  }

  const descargarPlantilla = () => {
    // Redirige a la ruta proxy que devuelve el binario con el header adecuado.
    window.location.href = "/api/pendientes-catalogo/import/plantilla"
  }

  const resumen = applied ?? preview
  const puedeAplicar = preview && !applied
    && (preview.insertadas > 0 || preview.actualizadas > 0)

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <SheetContent className="w-full sm:max-w-3xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar catálogo maestro desde Excel</SheetTitle>
          <SheetDescription>
            El archivo debe tener las columnas <strong>Nivel, Especialidad, Tipo, Accion, Motivo, Categoria, Descripcion</strong>.
            Los nombres se matchean case-insensitive contra los catálogos ya cargados.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 mt-4 space-y-4 pb-6">

        {!file && (
          <div className="mt-2 space-y-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 text-sm text-blue-900 hover:bg-blue-50"
            >
              <Upload className="h-8 w-8" />
              <span className="font-medium">Elegir archivo .xlsx</span>
              <span className="text-xs text-blue-800/70">o arrastralo aquí (próximamente)</span>
            </button>
            <button
              type="button"
              onClick={descargarPlantilla}
              className="flex items-center gap-2 text-xs text-blue-700 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla vacía
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />

        {file && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-700" />
              <span className="text-sm font-medium truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} disabled={previewMut.isPending || applyMut.isPending}>
              Cambiar
            </Button>
          </div>
        )}

        {previewMut.isPending && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analizando archivo...
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {resumen && (
          <div className="space-y-3">
            {resumen.erroresGenerales.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 space-y-0.5">
                <p className="font-semibold">Errores en el archivo:</p>
                <ul className="list-disc list-inside">
                  {resumen.erroresGenerales.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Chip label="Filas" value={resumen.totalFilas} tone="gray" />
              <Chip label={applied ? "Insertadas" : "A insertar"} value={resumen.insertadas} tone="green" />
              <Chip label={applied ? "Actualizadas" : "A actualizar"} value={resumen.actualizadas} tone="amber" />
              <Chip label="Ya existían" value={resumen.ignoradasDuplicadas} tone="gray" />
              <Chip label="Rechazadas" value={resumen.rechazadas} tone="red" />
            </div>

            {applied && (
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Importación aplicada. Cerrá el diálogo para ver el catálogo actualizado.
              </div>
            )}

            {resumen.filas.length > 0 && <FilasResumen filas={resumen.filas} />}
          </div>
        )}

          <div className="flex flex-row-reverse gap-2 border-t pt-3 mt-4">
            <Button variant="outline" onClick={cerrar}>
              {applied ? "Cerrar" : "Cancelar"}
            </Button>
            {puedeAplicar && (
              <Button onClick={aplicar} disabled={applyMut.isPending}>
                {applyMut.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Aplicando...</>
                  : `Aplicar (${(preview!.insertadas + preview!.actualizadas)} filas)`}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Helpers de UI ─────────────────────────────────────────────────────

function Chip({ label, value, tone }: { label: string; value: number; tone: "gray" | "green" | "amber" | "red" }) {
  const map: Record<string, string> = {
    gray:  "bg-gray-100 text-gray-700",
    green: "bg-green-50 text-green-800 ring-1 ring-green-200",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    red:   "bg-red-50 text-red-800 ring-1 ring-red-200",
  }
  return (
    <div className={`rounded-md px-2 py-1.5 text-center ${map[tone]}`}>
      <div className="text-lg font-semibold leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wide mt-1">{label}</div>
    </div>
  )
}

function FilasResumen({ filas }: { filas: PendienteCatalogoImportResult["filas"] }) {
  // Mostramos primero errores/warnings y luego OK — el user va a fijarse en lo problemático.
  const ordenadas = useMemo(() => {
    const pri: Record<string, number> = { Error: 0, Warning: 1, OK: 2 }
    return [...filas].sort((a, b) => (pri[a.estado] ?? 3) - (pri[b.estado] ?? 3))
  }, [filas])

  return (
    <div className="max-h-72 overflow-y-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white border-b">
          <tr className="text-left">
            <th className="px-2 py-1.5 font-medium w-14">Fila</th>
            <th className="px-2 py-1.5 font-medium w-20">Estado</th>
            <th className="px-2 py-1.5 font-medium">Combinación</th>
            <th className="px-2 py-1.5 font-medium">Mensaje</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f, i) => {
            const combo = [f.nivel, f.especialidad, f.tipo, f.accion, f.motivo].filter(Boolean).join(" · ")
            const badge = f.estado === "Error"
              ? "bg-red-100 text-red-800"
              : f.estado === "Warning"
              ? "bg-amber-100 text-amber-800"
              : "bg-green-100 text-green-800"
            const icon = f.estado === "Error"
              ? <XCircle className="h-3 w-3" />
              : <CheckCircle2 className="h-3 w-3" />
            return (
              <tr key={i} className="border-b last:border-0">
                <td className="px-2 py-1.5 text-muted-foreground">{f.filaExcel}</td>
                <td className="px-2 py-1.5">
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge}`}>
                    {icon}{f.estado}
                  </span>
                </td>
                <td className="px-2 py-1.5 truncate max-w-[280px]" title={combo}>{combo || "—"}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{f.mensaje ?? "—"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
