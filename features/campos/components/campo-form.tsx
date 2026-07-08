"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ImageIcon } from "lucide-react"

import { campoSchema, type CampoFormValues } from "../schema"
import type { Campo } from "../types"
import { slugifyCodigoCampo } from "../lib/slugify-codigo"
import {
  applyServerErrorsToForm,
  CAMPO_FIELD_MAP,
  type ServerValidationError,
} from "../lib/apply-server-errors"
import { CAMPO_TIPO_DATO, CAMPO_TIPO_DATO_ENTRIES_SORTED, type CampoTipoDato } from "@/features/planillas/types"
import { useUploadImagenCampo } from "@/features/planillas/api/use-upload-imagen-campo"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
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

interface CampoFormProps {
  defaultValues?: Partial<Campo>
  /**
   * Cantidad de planillas que usan este campo. Si > 0, se bloquea código y tipo de dato
   * porque cambiarlos rompe registros existentes / integraciones.
   */
  usoCount?: number
  onSubmit: (values: CampoFormValues) => void
  onCancel: () => void
  isPending: boolean
  /**
   * Errores de validación del backend. El shape espera `field` (nombre server, ej. "Codigo")
   * y una lista de mensajes. El form los mapea al field del form (lowerCamel) y los setea
   * con `form.setError` para mostrarlos inline. Ver `applyServerErrorsToForm`.
   */
  serverErrors?: ServerValidationError[]
}

export function CampoForm({
  defaultValues,
  usoCount = 0,
  onSubmit,
  onCancel,
  isPending,
  serverErrors,
}: CampoFormProps) {
  const enUso = usoCount > 0

  const form = useForm<CampoFormValues>({
    resolver: zodResolver(campoSchema),
    defaultValues: {
      codigo: defaultValues?.codigo ?? "",
      etiqueta: defaultValues?.etiqueta ?? "",
      etiquetaAlt: defaultValues?.etiquetaAlt ?? "",
      tipoDato: (defaultValues?.tipoDato ?? 1) as CampoTipoDato,
      numeroLineas: defaultValues?.numeroLineas ?? 3,
      unidad: defaultValues?.unidad ?? "",
      descripcion: defaultValues?.descripcion ?? "",
      imagenUrl: defaultValues?.imagenUrl ?? "",
      esObligatorioDefault: defaultValues?.esObligatorioDefault ?? false,
    },
  })

  const tipoDato = form.watch("tipoDato")
  const imagenUrl = form.watch("imagenUrl")
  const isImagen = tipoDato === 8
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadImagenCampo()

  // Aplica los errores de validación del backend a los fields del form.
  useEffect(() => {
    applyServerErrorsToForm(form, serverErrors, CAMPO_FIELD_MAP)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors])

  // Autogenerar `codigo` mientras el user tipea `etiqueta`, hasta que toque
  // el input del código manualmente. En modo edición (defaultValues.codigo
  // presente) arrancamos en modo "sucio" para nunca pisar códigos existentes.
  const [codigoSucio, setCodigoSucio] = useState<boolean>(
    Boolean(defaultValues?.codigo?.trim()),
  )

  const handleUploadImagen = async (file: File) => {
    const url = await uploadMutation.mutateAsync(file)
    form.setValue("imagenUrl", url, { shouldDirty: true })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {enUso && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Este campo está usado en <strong>{usoCount}</strong> planilla{usoCount !== 1 ? "s" : ""}.
            No se puede cambiar <strong>código</strong> ni <strong>tipo de dato</strong> mientras esté en uso.
          </div>
        )}

        {/* Orden del form: tipo → etiqueta → código (autogenerado desde etiqueta) → unidad.
            Elegir el tipo primero acota lo que el user espera en los siguientes campos
            (ej. tipo Imagen deshabilita etiqueta como texto útil, etc.). */}
        <FormField
          control={form.control}
          name="tipoDato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de dato *</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(v) => field.onChange(Number(v) as CampoTipoDato)}
                disabled={isPending || enUso}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>
                      {CAMPO_TIPO_DATO[field.value as CampoTipoDato] ?? ""}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CAMPO_TIPO_DATO_ENTRIES_SORTED.map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="etiqueta"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiqueta *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Temperatura del aceite"
                  disabled={isPending}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e)
                    // Si el user no tocó el código manualmente, lo re-derivamos
                    // desde la etiqueta en tiempo real.
                    if (!codigoSucio) {
                      form.setValue("codigo", slugifyCodigoCampo(e.target.value), {
                        shouldValidate: false,
                      })
                    }
                  }}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Texto que ve el usuario en formularios y PDF.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="etiquetaAlt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiqueta alternativa</FormLabel>
              <FormControl>
                <Input
                  placeholder="Oil temperature"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Opcional. Traducción o comentario que aparece debajo del label en el PDF,
                en itálica y más chico.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="codigo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código *</FormLabel>
              <FormControl>
                <Input
                  placeholder="TEMP_ACEITE"
                  disabled={isPending || enUso}
                  className="font-mono"
                  {...field}
                  onChange={(e) => {
                    // Cualquier edición manual del código lo marca como
                    // "sucio" y detiene el auto-derivado desde la etiqueta.
                    // Vaciarlo restaura el auto-derivado (útil para volver a
                    // sincronizar si cambiaste la etiqueta después).
                    setCodigoSucio(e.target.value.trim().length > 0)
                    field.onChange(e)
                  }}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {codigoSucio || enUso
                  ? "Identificador técnico único. Usado en integraciones."
                  : "Se genera automáticamente desde la etiqueta. Editalo si querés otro código."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unidad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad</FormLabel>
              <FormControl>
                <Input placeholder="°C" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Solo TextoArea (tipoDato === 12): número de líneas de escritura. */}
        {tipoDato === 12 && (
          <FormField
            control={form.control}
            name="numeroLineas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de líneas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    placeholder="3"
                    disabled={isPending}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      field.onChange(Number.isFinite(n) ? n : undefined)
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Cantidad de renglones (líneas de puntos) que se dibujan en la planilla en blanco.
                  Rango 1-20, default 3.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas / ayuda para quien complete el campo"
                  rows={3}
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
          name="esObligatorioDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 cursor-pointer"
                />
              </FormControl>
              <FormLabel className="mt-0! cursor-pointer font-normal">
                Obligatorio por defecto
              </FormLabel>
            </FormItem>
          )}
        />

        {isImagen && (
          <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/40 p-3">
            <Label className="text-xs font-semibold text-blue-900">Imagen</Label>
            {imagenUrl ? (
              <div className="rounded border bg-white p-2">
                <img
                  src={imagenUrl}
                  alt="Imagen del campo"
                  className="max-h-40 max-w-full object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="rounded border border-dashed border-blue-200 bg-white px-3 py-6 text-center text-xs text-muted-foreground">
                Sin imagen cargada
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUploadImagen(f)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending || isPending}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {uploadMutation.isPending
                  ? "Subiendo..."
                  : imagenUrl
                    ? "Reemplazar imagen"
                    : "Subir imagen"}
              </Button>
              {uploadMutation.isError && (
                <span className="text-xs text-red-600">Error al subir la imagen</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Formatos: JPG, PNG, WEBP, SVG, GIF. Máximo 5 MB.
            </p>
          </div>
        )}

        {/* Error "root" del backend (no atribuible a un field específico). */}
        {form.formState.errors.root?.message && (
          <p className="text-sm text-red-600 whitespace-pre-line">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1 bg-blue-900 hover:bg-blue-800">
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  )
}
