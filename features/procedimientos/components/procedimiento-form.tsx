"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

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
  onSubmit: (values: ProcedimientoFormValues) => void
  isPending: boolean
  onCancel: () => void
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
      nombreArchivoId: defaultValues?.nombreArchivoId ?? "",
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
            name="nombreArchivoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Archivo de referencia</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: PRC-001.pdf"
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
