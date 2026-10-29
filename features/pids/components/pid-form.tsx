"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"

import { pidArchivoSchema, type PidArchivoFormValues } from "../schema"
import type { PidArchivoDetalle } from "../types"
import type { RotacionGrados } from "../api/use-mutate-pids"
import { PidPreviewRotacion } from "./pid-preview-rotacion"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"

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

interface PidFormProps {
  defaultValues?: Partial<PidArchivoDetalle>
  /** Solo requerido en modo creación — al editar el archivo se reemplaza aparte. */
  requireArchivo: boolean
  /**
   * `rotacionGrados` es la rotación elegida en la previsualización: se escribe
   * en el PDF al guardarlo, no es una preferencia de vista. Siempre 0 cuando no
   * se adjunta archivo.
   */
  onSubmit: (
    values: PidArchivoFormValues,
    archivo: File | null,
    rotacionGrados: RotacionGrados,
  ) => void
  isPending: boolean
  onCancel: () => void
}

export function PidForm({
  defaultValues,
  requireArchivo,
  onSubmit,
  isPending,
  onCancel,
}: PidFormProps) {
  const { data: subsistemasRaw, isLoading: loadingSubs } = useGetSubSistemasSelect()
  const subsistemas = (subsistemasRaw as any)?.data ?? []

  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoError, setArchivoError] = useState<string | null>(null)
  const [rotacion, setRotacion] = useState<RotacionGrados>(0)

  const form = useForm<PidArchivoFormValues>({
    resolver: zodResolver(pidArchivoSchema),
    defaultValues: {
      codigo: defaultValues?.codigo ?? "",
      nombre: defaultValues?.nombre ?? "",
      descripcion: defaultValues?.descripcion ?? "",
      subSistemaIds: defaultValues?.subSistemaIds ?? [],
    },
  })

  const handleSubmit = (values: PidArchivoFormValues) => {
    if (requireArchivo && !archivo) {
      setArchivoError("Seleccioná el PDF del PID.")
      return
    }
    setArchivoError(null)
    onSubmit(values, archivo, archivo ? rotacion : 0)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general
          </p>

          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: PID-001" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: PID Línea de Gas" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas o contexto sobre el diagrama..."
                    disabled={isPending}
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Archivo (solo en modo creación; en edición se reemplaza vía otro endpoint) */}
        {requireArchivo && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Archivo PDF
            </p>
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={isPending}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setArchivo(f)
                // Cada archivo arranca sin rotar: la del anterior no aplica.
                setRotacion(0)
                if (f) setArchivoError(null)
              }}
              className="text-sm"
            />
            {archivo && (
              <p className="text-xs text-muted-foreground">
                {archivo.name} — {(archivo.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            {archivo && (
              <PidPreviewRotacion
                // Remonta al cambiar de archivo: el preview arranca limpio sin
                // tener que resetear su estado a mano.
                key={`${archivo.name}-${archivo.size}-${archivo.lastModified}`}
                fuente={archivo}
                rotacion={rotacion}
                onRotacionChange={setRotacion}
                disabled={isPending}
                leyenda={
                  rotacion !== 0
                    ? `El PDF se va a guardar girado ${rotacion}°. Afecta al archivo, no sólo a la vista.`
                    : "Si el plano está acostado, giralo antes de guardar."
                }
              />
            )}
            {archivoError && <p className="text-sm text-destructive">{archivoError}</p>}
          </div>
        )}

        {/* Subsistemas vinculados (N:N) */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subsistemas vinculados
          </p>
          <p className="text-xs text-muted-foreground">
            Marcá los subsistemas que este PID representa. Opcional — se puede editar después.
          </p>
          <Controller
            control={form.control}
            name="subSistemaIds"
            render={({ field }) => (
              <div className="max-h-64 overflow-y-auto rounded border p-3 space-y-1">
                {loadingSubs ? (
                  <p className="text-sm text-muted-foreground">Cargando subsistemas…</p>
                ) : subsistemas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay subsistemas en el proyecto.</p>
                ) : (
                  subsistemas.map((s: any) => {
                    const current = field.value ?? []
                    const checked = current.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-muted rounded px-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isPending}
                          onChange={(e) => {
                            if (e.target.checked) field.onChange([...current, s.id])
                            else field.onChange(current.filter((x: string) => x !== s.id))
                          }}
                        />
                        <span>{s.codigo} — {s.nombre}</span>
                      </label>
                    )
                  })
                )}
              </div>
            )}
          />
        </div>

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
