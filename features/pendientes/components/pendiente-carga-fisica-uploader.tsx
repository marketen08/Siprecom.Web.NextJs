"use client"

import { useRef, useState } from "react"
import { CheckCircle2, FileUp, Loader2, ScanQrCode, Upload, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { readQrFromFile } from "@/features/registros/lib/read-qr"
import { rotateFile } from "@/features/registros/lib/rotate-file"
import { useCompletarFisicoPendiente } from "../api/use-completar-fisico-pendiente"

interface Props {
  pendienteId: string
  codigoFormateado: string
  /** Callback tras carga exitosa (ej. cerrar modal, refrescar sheet). */
  onSuccess?: () => void
}

type EstadoUi =
  | "idle"           // sin archivo
  | "leyendo-qr"     // decodificando
  | "qr-mismatch"    // QR válido pero apunta a otro pendiente / otro tipo
  | "listo"          // OK, se puede subir
  | "subiendo"
  | "ok"
  | "error"

/**
 * Uploader "single-shot" para carga física de un pendiente puntual. Comparte
 * primitivas con el uploader de registros de tareas (`read-qr`, `rotate-file`)
 * pero sin detección visual de firmas — el user es responsable del contenido
 * del PDF firmado.
 */
export function PendienteCargaFisicaUploader({ pendienteId, codigoFormateado, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [estado, setEstado] = useState<EstadoUi>("idle")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [qrInfo, setQrInfo] = useState<string | null>(null)
  const [rotacion, setRotacion] = useState<0 | 90 | 180 | 270>(0)
  const [error, setError] = useState<string | null>(null)
  const [observaciones, setObservaciones] = useState("")
  // Diálogo de override cuando el QR del PDF no coincide con este pendiente.
  const [mismatchOpen, setMismatchOpen] = useState(false)
  const [qrOverrideDetalle, setQrOverrideDetalle] = useState<string | null>(null)

  const mut = useCompletarFisicoPendiente(pendienteId)

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setError(null)
    setQrOverrideDetalle(null)
    setArchivo(file)
    setEstado("leyendo-qr")
    setQrInfo(null)

    const qr = await readQrFromFile(file)
    setRotacion(qr.rotacionDetectada)

    if (!qr.qrEncontrado) {
      setQrInfo("Sin QR legible en el archivo.")
      setMismatchOpen(true)
      setEstado("qr-mismatch")
      return
    }
    if (qr.esChecklist) {
      setQrInfo(`Este archivo tiene QR de tarea (checklist), no de pendiente.`)
      setMismatchOpen(true)
      setEstado("qr-mismatch")
      return
    }
    if (!qr.esPendienteCarga) {
      setQrInfo(`QR no reconocido: ${qr.contenidoQr ?? "(vacío)"}`)
      setMismatchOpen(true)
      setEstado("qr-mismatch")
      return
    }
    if (qr.pendienteId !== pendienteId.toLowerCase()) {
      setQrInfo(`El QR apunta a otro pendiente (${qr.pendienteId}).`)
      setMismatchOpen(true)
      setEstado("qr-mismatch")
      return
    }
    setQrInfo("QR verificado — coincide con este pendiente.")
    setEstado("listo")
  }

  async function subir() {
    if (!archivo) return
    setEstado("subiendo")
    setError(null)
    try {
      const finalFile = rotacion === 0 ? archivo : await rotateFile(archivo, rotacion)
      await mut.mutateAsync({
        archivo: finalFile,
        observaciones: observaciones.trim() || null,
        qrOverrideDetalle,
      })
      setEstado("ok")
      onSuccess?.()
    } catch (err) {
      setError((err as Error).message ?? "Error al subir.")
      setEstado("error")
    }
  }

  function reset() {
    setArchivo(null)
    setQrInfo(null)
    setQrOverrideDetalle(null)
    setEstado("idle")
    setError(null)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border-2 border-dashed border-gray-300 p-6 text-center bg-gray-50">
        {estado === "idle" && (
          <>
            <FileUp className="h-10 w-10 mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-700">
              Cargá el PDF (o imagen) firmado en papel del pendiente <strong className="font-mono">{codigoFormateado}</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              El sistema lee el QR del PDF para verificar que corresponde a este pendiente.
            </p>
            <Button className="mt-3 gap-2" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Seleccionar archivo
            </Button>
          </>
        )}

        {estado === "leyendo-qr" && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
            <Loader2 className="h-4 w-4 animate-spin" /> Leyendo QR del archivo…
          </div>
        )}

        {(estado === "listo" || estado === "qr-mismatch") && archivo && (
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileUp className="h-4 w-4 text-gray-500" />
              <span className="font-medium truncate">{archivo.name}</span>
              <span className="text-xs text-muted-foreground">({(archivo.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
            <div className={`flex items-center gap-2 text-xs ${estado === "listo" ? "text-green-700" : "text-amber-700"}`}>
              <ScanQrCode className="h-3.5 w-3.5" />
              {qrInfo}
            </div>
            {qrOverrideDetalle && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                Carga forzada — se registrará el motivo: {qrOverrideDetalle}
              </p>
            )}
            <Textarea
              placeholder="Observaciones opcionales (visibles en el historial)…"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 gap-2 bg-blue-900 hover:bg-blue-800" onClick={subir}
                disabled={estado !== "listo" && qrOverrideDetalle == null}>
                <Upload className="h-4 w-4" /> Cargar y cerrar pendiente
              </Button>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
            </div>
          </div>
        )}

        {estado === "subiendo" && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo…
          </div>
        )}

        {estado === "ok" && (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <p className="text-sm font-medium text-green-800">Pendiente cerrado con PDF físico.</p>
            <Button variant="outline" size="sm" onClick={reset}>Cargar otro archivo</Button>
          </div>
        )}

        {estado === "error" && (
          <div className="flex flex-col items-center gap-2">
            <XCircle className="h-10 w-10 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
            <Button variant="outline" size="sm" onClick={reset}>Reintentar</Button>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={onFileSelected} />

      {/* Dialog de override: QR mismatch / sin QR. El user puede forzar la carga
          escribiendo un motivo — queda en el historial. */}
      <AlertDialog open={mismatchOpen} onOpenChange={setMismatchOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>QR no coincide con este pendiente</AlertDialogTitle>
            <AlertDialogDescription>
              {qrInfo}
              <br />¿Querés forzar la carga igual? Se registrará el motivo en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo de la carga forzada (obligatorio para continuar)…"
            value={qrOverrideDetalle ?? ""}
            onChange={(e) => setQrOverrideDetalle(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={reset}>Cambiar archivo</AlertDialogCancel>
            <AlertDialogAction
              disabled={!qrOverrideDetalle || qrOverrideDetalle.trim().length < 3}
              onClick={() => {
                setMismatchOpen(false)
                setEstado("listo")
              }}
            >
              Forzar carga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
