"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Download, FileText, Loader2, Paperclip, X } from "lucide-react"

import { procedimientoSchema, type ProcedimientoFormInput, type ProcedimientoFormValues } from "../schema"
import type { Procedimiento } from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface ProcedimientoFormProps {
  defaultValues?: Partial<Procedimiento>
  /** Datos de texto del procedimiento (sin archivo). */
  onSubmit: (values: ProcedimientoFormValues, archivo: File | null) => void
  isPending: boolean
  onCancel: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function ProcedimientoForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: ProcedimientoFormProps) {
  const form = useForm<ProcedimientoFormInput, any, ProcedimientoFormValues>({
    resolver: zodResolver(procedimientoSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      observaciones: defaultValues?.observaciones ?? "",
    },
  })

  // Archivo seleccionado por el usuario en esta sesión (todavía no subido).
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null)
  const [archivoError, setArchivoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Archivo ya cargado en el servidor (para el caso de edición).
  const archivoExistente = defaultValues?.nombreArchivo
    ? {
        nombre: defaultValues.nombreArchivo,
        tamanio: defaultValues.tamanioBytes,
        url: defaultValues.archivoUrl,
      }
    : null

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setArchivoError(null)
    const file = e.target.files?.[0]
    e.target.value = "" // permite re-seleccionar el mismo archivo después
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
      setArchivoError("Solo se permiten archivos PDF.")
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setArchivoError("El archivo supera los 50 MB.")
      return
    }
    setArchivoNuevo(file)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values, archivoNuevo))}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general
          </p>

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Procedimiento de prueba hidráulica"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas o comentarios..."
                    disabled={isPending}
                    rows={4}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Archivo PDF (subida diferida — se procesa después del create/update) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Archivo PDF</label>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={handleFileSelected}
            />

            {archivoNuevo ? (
              <div className="flex items-center gap-2 rounded-md border bg-blue-50 border-blue-200 px-3 py-2">
                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 truncate">{archivoNuevo.name}</p>
                  <p className="text-xs text-blue-700">
                    {formatBytes(archivoNuevo.size)} · se subirá al guardar
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-blue-700"
                  onClick={() => setArchivoNuevo(null)}
                  disabled={isPending}
                  aria-label="Quitar archivo"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : archivoExistente ? (
              <div className="flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-2">
                <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{archivoExistente.nombre}</p>
                  {archivoExistente.tamanio != null && (
                    <p className="text-xs text-muted-foreground">{formatBytes(archivoExistente.tamanio)}</p>
                  )}
                </div>
                {archivoExistente.url && (
                  <a href={archivoExistente.url} target="_blank" rel="noopener noreferrer">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Descargar">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Sin archivo cargado.
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
              >
                <Paperclip className="h-3.5 w-3.5" />
                {archivoExistente && !archivoNuevo ? "Reemplazar PDF" : "Adjuntar PDF"}
              </Button>
              <span className="text-[10px] text-muted-foreground">Solo PDF · máx. 50 MB</span>
            </div>

            {archivoError && <p className="text-xs text-red-600">{archivoError}</p>}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1 bg-blue-900 hover:bg-blue-800">
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  )
}
