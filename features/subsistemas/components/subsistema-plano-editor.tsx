"use client"

import { useRef, useState } from "react"
import { FileText, Loader2, Trash2, Upload } from "lucide-react"
import {
  fetchPlanoUrl,
  useDeletePlanoSubsistema,
  useUploadPlanoSubsistema,
} from "../api/use-subsistema-plano"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function fmtTamanio(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  subSistemaId: string
  /** Nombre actual del archivo cargado. Null/undefined = no hay plano. */
  nombreArchivo: string | null | undefined
  tamanioBytes: number | null | undefined
  /** Callback opcional para refrescar el padre tras cambios. */
  onChange?: () => void
}

export function SubSistemaPlanoEditor({ subSistemaId, nombreArchivo, tamanioBytes, onChange }: Props) {
  const upload = useUploadPlanoSubsistema(subSistemaId)
  const remove = useDeletePlanoSubsistema(subSistemaId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [openingPdf, setOpeningPdf] = useState(false)

  const tienePlano = !!nombreArchivo

  function elegirArchivo() {
    setError(null)
    fileInputRef.current?.click()
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // reset para poder re-elegir el mismo archivo
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("El archivo debe ser un PDF.")
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("El archivo supera los 50 MB.")
      return
    }
    try {
      await upload.mutateAsync(file)
      onChange?.()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function eliminar() {
    setError(null)
    try {
      await remove.mutateAsync()
      setConfirmOpen(false)
      onChange?.()
    } catch (err) {
      setError((err as Error).message)
      setConfirmOpen(false)
    }
  }

  async function abrirPdf() {
    setError(null)
    setOpeningPdf(true)
    try {
      const { url } = await fetchPlanoUrl(subSistemaId)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setOpeningPdf(false)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Plano (PDF)</h3>
        <p className="text-xs text-muted-foreground">
          PDF del diagrama del subsistema. Tamaño máx 50 MB.
        </p>
      </div>

      {tienePlano ? (
        <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
          <FileText className="h-5 w-5 text-blue-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={abrirPdf}
              disabled={openingPdf}
              className="text-sm font-medium text-blue-700 hover:underline truncate text-left block w-full"
              title={nombreArchivo ?? ""}
            >
              {openingPdf ? "Abriendo..." : nombreArchivo}
            </button>
            {tamanioBytes != null && (
              <p className="text-xs text-muted-foreground">{fmtTamanio(tamanioBytes)}</p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={elegirArchivo}
            disabled={upload.isPending}
            className="gap-1.5"
          >
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Reemplazar
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => setConfirmOpen(true)}
            disabled={remove.isPending || upload.isPending}
            title="Eliminar plano"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 p-4 justify-between">
          <span className="text-sm text-muted-foreground">No hay plano cargado.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={elegirArchivo}
            disabled={upload.isPending}
            className="gap-1.5"
          >
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Subir PDF
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onFileChange}
      />

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plano</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el plano <strong>{nombreArchivo}</strong>? Esta acción borra el PDF de
              forma definitiva. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => { e.preventDefault(); eliminar() }}
            >
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
