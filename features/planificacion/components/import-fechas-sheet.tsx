"use client"

import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  FileSpreadsheet, Loader2, Upload, CheckCircle2, AlertCircle, Download,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface PreviewFila {
  fila: number
  tag: string
  tarea: string
  fechaNueva: string
  fechaActual: string | null
  elementoTareaId: string
  vaCambiar: boolean
  motivoSkip: string | null
}

interface PreviewData {
  total: number
  vanACambiar: number
  sinCambio: number
  skipeadas: number
  filas: PreviewFila[]
  errores: string[]
}

interface ApplyResult {
  actualizadas: number
  snapshotNumero: number
  snapshotId: string | null
  tareasEnSnapshot: number
}

type Step = "upload" | "analizando" | "preview" | "aplicando" | "ok" | "error"

interface Props {
  open: boolean
  onClose: () => void
}

export function ImportFechasSheet({ open, onClose }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("upload")
  const [errorMsg, setErrorMsg] = useState("")
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<ApplyResult | null>(null)

  function resetear() {
    setStep("upload")
    setErrorMsg("")
    setPreview(null)
    setArchivo(null)
    setResultado(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function cerrar() {
    resetear()
    onClose()
  }

  async function descargarPlantilla() {
    // Fuerza descarga vía anchor con blob: así el navegador respeta el filename del
    // Content-Disposition del backend + hace la descarga sin cambiar de página.
    const res = await fetch("/api/planificacion/fechas/plantilla")
    if (!res.ok) {
      setErrorMsg("No se pudo descargar la plantilla.")
      setStep("error")
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    // filename del header si viene; si no, un default razonable
    const cd = res.headers.get("content-disposition") ?? ""
    const match = cd.match(/filename=([^;]+)/i)
    a.download = match ? match[1].replace(/"/g, "").trim() : "planificacion-fechas.xlsx"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file)
    setStep("analizando")
    setErrorMsg("")

    try {
      const fd = new FormData()
      fd.append("archivo", file)
      const res = await fetch("/api/planificacion/fechas/preview", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message ?? "No se pudo procesar el archivo.")
      }
      // Backend devuelve envelope { data, message }.
      const p: PreviewData = data.data ?? data
      setPreview(p)
      setStep("preview")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado")
      setStep("error")
    }
  }

  async function aplicar() {
    if (!archivo) return
    setStep("aplicando")
    setErrorMsg("")
    try {
      const fd = new FormData()
      fd.append("archivo", archivo)
      const res = await fetch("/api/planificacion/fechas/apply", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message ?? "No se pudo aplicar el import.")
      }
      const r: ApplyResult = data.data ?? data
      setResultado(r)
      setStep("ok")
      // Invalidamos las queries relevantes para que la tabla y las versiones se refresquen.
      qc.invalidateQueries({ queryKey: ["planificacion", "tareas"] })
      qc.invalidateQueries({ queryKey: ["planificacion", "versiones"] })
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado")
      setStep("error")
    }
  }

  return (
    <Sheet open={open} onOpenChange={cerrar}>
      <SheetContent className="w-full sm:max-w-3xl! flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar fechas planificadas
          </SheetTitle>
          <SheetDescription>
            Descargá la plantilla (viene precargada con tus tareas y fechas actuales), editala en
            Excel y volvé a subirla. Al aplicar se crea un snapshot (Pn) con el estado resultante.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 px-1 pb-6 space-y-4">
          {/* STEP: upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  <strong>Paso 1:</strong> descargá la plantilla con las tareas del proyecto y sus
                  fechas actuales.
                </p>
                <Button onClick={descargarPlantilla} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar plantilla Excel
                </Button>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 text-center gap-3 hover:border-blue-400 transition-colors">
                <Upload className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-700 text-sm">
                    <strong>Paso 2:</strong> subí el archivo editado
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Formatos: .xlsx, .xls</p>
                </div>
                <Button onClick={() => fileRef.current?.click()} variant="outline" size="sm">
                  Elegir archivo
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Solo se actualizan tareas en estado <strong>Pendiente</strong> o <strong>En proceso</strong>.</p>
                <p>• Si algún TAG + Tarea no matchea, el import se rechaza — corregí el Excel y volvé a subirlo.</p>
                <p>• Las filas con fecha igual a la actual se saltean silenciosamente.</p>
                <p>• Al aplicar se crea un snapshot Pn con el estado resultante — visible en el listado de versiones.</p>
              </div>
            </div>
          )}

          {/* STEP: analizando */}
          {step === "analizando" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="font-medium text-gray-700">Analizando archivo...</p>
            </div>
          )}

          {/* STEP: aplicando */}
          {step === "aplicando" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="font-medium text-gray-700">Aplicando cambios...</p>
              <p className="text-xs text-muted-foreground">Actualizando fechas y creando snapshot Pn</p>
            </div>
          )}

          {/* STEP: error */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="font-medium text-gray-700">Ocurrió un error</p>
              <pre className="text-xs text-muted-foreground text-left max-w-full whitespace-pre-wrap wrap-break-word rounded-lg border bg-red-50 p-3">
                {errorMsg}
              </pre>
              <Button onClick={resetear} variant="outline">Intentar de nuevo</Button>
            </div>
          )}

          {/* STEP: ok */}
          {step === "ok" && resultado && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-lg text-gray-800">¡Import aplicado!</p>
              <div className="w-full max-w-md rounded-lg border bg-gray-50 p-4 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground shrink-0 w-40">Tareas actualizadas</span>
                  <span className="text-sm font-medium text-gray-800">{resultado.actualizadas}</span>
                </div>
                {resultado.snapshotNumero > 0 && (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground shrink-0 w-40">Snapshot creado</span>
                      <span className="text-sm font-medium text-gray-800">P{resultado.snapshotNumero}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground shrink-0 w-40">Tareas en el snapshot</span>
                      <span className="text-sm font-medium text-gray-800">{resultado.tareasEnSnapshot}</span>
                    </div>
                  </>
                )}
              </div>
              <Button onClick={cerrar}>Cerrar</Button>
            </div>
          )}

          {/* STEP: preview */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Contadores */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{preview.total} filas</Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {preview.vanACambiar} van a cambiar
                </Badge>
                {preview.sinCambio > 0 && (
                  <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                    {preview.sinCambio} sin cambio
                  </Badge>
                )}
                {preview.skipeadas > 0 && (
                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200">
                    {preview.skipeadas} skipeadas (estado terminal)
                  </Badge>
                )}
                {preview.errores.length > 0 && (
                  <Badge className="bg-red-50 text-red-800 border border-red-200">
                    {preview.errores.length} errores
                  </Badge>
                )}
              </div>

              {/* Errores duros — si hay, no se puede aplicar */}
              {preview.errores.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                  <p className="text-sm font-medium text-red-800">
                    El import no se puede aplicar hasta corregir estos errores:
                  </p>
                  <ul className="text-xs text-red-700 list-disc pl-4 space-y-0.5 max-h-40 overflow-y-auto">
                    {preview.errores.slice(0, 20).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {preview.errores.length > 20 && (
                      <li className="italic">…y {preview.errores.length - 20} error(es) más</li>
                    )}
                  </ul>
                </div>
              )}

              <Separator />

              {/* Tabla de filas */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Fila</TableHead>
                      <TableHead>TAG</TableHead>
                      <TableHead>Tarea</TableHead>
                      <TableHead>Fecha actual</TableHead>
                      <TableHead>Fecha nueva</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.filas.slice(0, 200).map((f, i) => (
                      <TableRow key={`${f.fila}-${i}`}>
                        <TableCell className="text-xs text-muted-foreground">{f.fila}</TableCell>
                        <TableCell className="font-mono text-xs">{f.tag}</TableCell>
                        <TableCell className="text-sm">{f.tarea}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {f.fechaActual ? formatFecha(f.fechaActual) : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {formatFecha(f.fechaNueva)}
                        </TableCell>
                        <TableCell>
                          {f.vaCambiar ? (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                              Cambia
                            </Badge>
                          ) : f.motivoSkip === "Misma fecha." ? (
                            <span className="text-[10px] text-muted-foreground">Sin cambio</span>
                          ) : (
                            <span className="text-[10px] text-amber-700" title={f.motivoSkip ?? ""}>
                              {f.motivoSkip}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {preview.filas.length > 200 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground italic">
                          Mostrando primeras 200 filas de {preview.filas.length}.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={aplicar}
                  disabled={preview.errores.length > 0 || preview.vanACambiar === 0}
                  className="flex-1"
                >
                  Aplicar {preview.vanACambiar > 0 ? `(${preview.vanACambiar} cambios)` : ""}
                </Button>
                <Button variant="outline" onClick={resetear}>
                  Volver
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function formatFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  // dd/mm/yyyy en Argentina — es lo que espera el usuario.
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`
}
