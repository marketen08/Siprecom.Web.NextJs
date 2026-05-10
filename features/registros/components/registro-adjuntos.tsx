"use client"

import { useRef, useState } from "react"
import { Paperclip, Upload, Loader2, Trash2, Download, FileText, Image as ImageIcon } from "lucide-react"

import {
  useGetRegistroArchivos,
  useUploadRegistroArchivo,
  useDeleteRegistroArchivo,
  type RegistroArchivo,
} from "@/features/registros/api/use-registro-archivos"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

// Posiciones reservadas que NO son adjuntos del usuario (no se muestran ni se permite borrar).
const POSICION_FISICO = 0
const POSICION_CERTIFICADO = 999

interface Props {
  registroId: string
  /** True si el proyecto y la planilla permiten adjuntos. Si es false, solo lectura. */
  permiteSubir: boolean
  /** True si el registro está en un estado que no debería aceptar más cambios (FIRMADO/APROBADO). */
  readOnly?: boolean
}

export function RegistroAdjuntos({ registroId, permiteSubir, readOnly = false }: Props) {
  const { data, isLoading } = useGetRegistroArchivos(registroId)
  const upload = useUploadRegistroArchivo(registroId)
  const del = useDeleteRegistroArchivo(registroId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  // Filtramos archivos: el "físico" y el "certificado de firmas" se muestran/gestionan en otro lado.
  const archivos = (data?.data ?? []).filter(
    (a) => a.posicion !== POSICION_FISICO && a.posicion !== POSICION_CERTIFICADO
  )

  const puedeAccionar = permiteSubir && !readOnly

  async function handleFileSelected(file: File) {
    setError(null)
    try {
      await upload.mutateAsync(file)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Archivos adjuntos
        </h2>
        <span className="text-xs text-muted-foreground">
          {archivos.length} archivo{archivos.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {!permiteSubir && (
          <p className="text-xs text-muted-foreground italic">
            El proyecto o la planilla no permite adjuntar archivos en este registro.
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Cargando archivos...
          </div>
        ) : archivos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            No hay archivos adjuntos.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {archivos.map((a) => (
              <ArchivoRow
                key={a.id}
                archivo={a}
                canDelete={puedeAccionar}
                onDelete={() => del.mutateAsync(a.id)}
                isDeleting={del.isPending && del.variables === a.id}
              />
            ))}
          </ul>
        )}

        {puedeAccionar && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelected(f)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            />
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {upload.isPending ? "Subiendo..." : "Subir archivo"}
              </Button>
              <span className="text-[10px] text-muted-foreground">
                PDF, imágenes, Word, Excel, CSV. Máximo 25 MB.
              </span>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}

function ArchivoRow({
  archivo,
  canDelete,
  onDelete,
  isDeleting,
}: {
  archivo: RegistroArchivo
  canDelete: boolean
  onDelete: () => Promise<unknown>
  isDeleting: boolean
}) {
  const isImage = archivo.contentType.startsWith("image/")
  const Icon = isImage ? ImageIcon : FileText

  return (
    <li className="flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5">
      <Icon className="h-4 w-4 text-gray-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{archivo.nombreArchivo}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatBytes(archivo.tamanioBytes)}
        </p>
      </div>
      <a
        href={archivo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
        title="Descargar"
      >
        <Button size="icon" variant="ghost" className="h-7 w-7">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </a>
      {canDelete && (
        <ConfirmActionDialog
          trigger={<Trash2 className="h-3.5 w-3.5" />}
          triggerClassName="inline-flex items-center justify-center h-7 w-7 rounded-md text-destructive hover:bg-accent transition-colors shrink-0"
          title="¿Eliminar archivo?"
          description={<>Se eliminará <strong>{archivo.nombreArchivo}</strong>. Esta acción no se puede deshacer.</>}
          confirmText="Eliminar"
          pendingText={isDeleting ? "Eliminando..." : "Eliminando..."}
          variant="destructive"
          onConfirm={onDelete}
        />
      )}
    </li>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
