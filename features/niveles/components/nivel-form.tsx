"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { nivelSchema, type NivelFormValues } from "../schema"
import type { Nivel } from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface NivelFormProps {
  defaultValues?: Partial<Nivel>
  onSubmit: (values: NivelFormValues) => void
  isPending: boolean
  onCancel: () => void
  /** Mensaje de error del backend (ej. 400 de validación) para mostrar en el form. */
  errorMessage?: string | null
}

/** Color default cuando el user no eligió uno todavía. Neutro, evita imponer color. */
const COLOR_DEFAULT = "#6b7280"

export function NivelForm({ defaultValues, onSubmit, isPending, onCancel, errorMessage }: NivelFormProps) {
  const form = useForm<NivelFormValues>({
    resolver: zodResolver(nivelSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      posicion: defaultValues?.posicion ?? 0,
      color: defaultValues?.color ?? null,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

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
                    placeholder="Ej: Planta baja"
                    disabled={isPending}
                    maxLength={50}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="posicion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posición</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    step={1}
                    disabled={isPending}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Define el orden de los niveles (menor primero). Debe ser único.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={field.value || COLOR_DEFAULT}
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={isPending}
                      className="h-9 w-12 rounded border border-gray-200 cursor-pointer disabled:opacity-60"
                      aria-label="Elegir color"
                    />
                    <Input
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="#2563eb"
                      disabled={isPending}
                      maxLength={9}
                      className="font-mono text-sm"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Hex #RRGGBB. Se usa para identificar el nivel en chips, agrupaciones y charts.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {errorMessage && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 whitespace-pre-line">
            {errorMessage}
          </p>
        )}

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
