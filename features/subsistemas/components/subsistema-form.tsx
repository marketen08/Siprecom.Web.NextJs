"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { subsistemaSchema, type SubSistemaFormValues } from "../schema"
import type { SubSistema } from "../types"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface SubSistemaFormProps {
  defaultValues?: Partial<SubSistema>
  onSubmit: (values: SubSistemaFormValues) => void
  isPending: boolean
  onCancel: () => void
}

export function SubSistemaForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: SubSistemaFormProps) {
  const { data: sistemasData, isLoading: loadingSistemas } = useGetSistemasSelect()

  const form = useForm<SubSistemaFormValues>({
    resolver: zodResolver(subsistemaSchema),
    defaultValues: {
      codigo: defaultValues?.codigo ?? "",
      nombre: defaultValues?.nombre ?? "",
      sistemaId: defaultValues?.sistemaId ?? "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* Sección: Información general */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general
          </p>

          <FormField
            control={form.control}
            name="sistemaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sistema</FormLabel>
                <Select
                  disabled={isPending || loadingSistemas}
                  onValueChange={(v) => v && field.onChange(v)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSistemas ? "Cargando sistemas..." : "Seleccioná un sistema"}>
                        {sistemasData?.data.find((s) => s.id === field.value)?.nombre
                          ?? (loadingSistemas ? "Cargando sistemas..." : "Seleccioná un sistema")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sistemasData?.data.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.codigo} — {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: SUB-001"
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
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Subsistema de Fuerza"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Nota: las fechas planificadas por nivel se editan en una grilla aparte, una vez
            guardado el subsistema (usa la ruta /subsistemas/{id}/niveles). */}

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
