"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { clienteSchema, type ClienteFormValues } from "../schema"
import type { Cliente } from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LOGO_MAX_BYTES = 500 * 1024 // 500 KB
const LOGO_MIME = "image/png"

interface ClienteFormProps {
  defaultValues?: Partial<Cliente>
  onSubmit: (values: ClienteFormValues, logoFile: File | null) => void
  isPending: boolean
  onCancel: () => void
  /**
   * Si se pasa, fija el campo "esContratista" y oculta el selector.
   * Útil cuando se crea desde la página específica (Clientes vs Contratistas).
   */
  fixedEsContratista?: boolean
  /**
   * Si es true, el campo "Tipo" se muestra pero deshabilitado.
   * Pensado para edición: no se permite mover entre listas.
   */
  readOnlyTipo?: boolean
}

export function ClienteForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  fixedEsContratista,
  readOnlyTipo,
}: ClienteFormProps) {
  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      esContratista: fixedEsContratista ?? defaultValues?.esContratista ?? false,
    },
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const existingLogoUrl = defaultValues?.logoSasUrl || defaultValues?.urlLogo || null

  // Cleanup del object URL para evitar leaks.
  useEffect(() => {
    if (!logoFile) {
      setFilePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setFilePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    e.target.value = "" // permite re-seleccionar el mismo archivo
    if (!file) return

    if (file.type !== LOGO_MIME) {
      setLogoError("Solo se aceptan archivos PNG.")
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError(`El archivo excede ${LOGO_MAX_BYTES / 1024} KB.`)
      return
    }
    setLogoError(null)
    setLogoFile(file)
  }

  function handleRemoveSelectedFile() {
    setLogoFile(null)
    setLogoError(null)
  }

  const previewUrl = filePreviewUrl ?? existingLogoUrl
  const handleFormSubmit = form.handleSubmit((values) => onSubmit(values, logoFile))

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">

        {/* Sección: Información general */}
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
                    placeholder="Ej: Empresa Constructora SA"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {fixedEsContratista === undefined && (
            <FormField
              control={form.control}
              name="esContratista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    disabled={isPending || readOnlyTipo}
                    onValueChange={(v) => v && field.onChange(v === "true")}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná un tipo">
                          {field.value ? "Contratista" : "Cliente"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">Cliente</SelectItem>
                      <SelectItem value="true">Contratista</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Separator />

        {/* Sección: Logo */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Logo
          </p>

          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 rounded-md border bg-gray-50 flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={handleFilePick}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {existingLogoUrl || logoFile ? "Cambiar" : "Subir"}
                </Button>
                {logoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    disabled={isPending}
                    onClick={handleRemoveSelectedFile}
                  >
                    <X className="h-4 w-4" />
                    Descartar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG hasta 500&nbsp;KB. Se muestra en el PDF de los registros firmados.
              </p>
            </div>
          </div>

          {logoError && (
            <p className="text-xs text-destructive">{logoError}</p>
          )}
          {logoFile && !logoError && (
            <p className="text-xs text-green-700">
              Archivo listo para subir: <span className="font-mono">{logoFile.name}</span> ({Math.round(logoFile.size / 1024)} KB)
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1 bg-blue-900 hover:bg-blue-800">
            {isPending ? "Guardando..." : "Guardar"}
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
