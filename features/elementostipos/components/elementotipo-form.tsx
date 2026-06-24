"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { elementoTipoSchema, type ElementoTipoFormValues } from "../schema"
import type { ElementoTipo } from "../types"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
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

interface ElementoTipoFormProps {
  defaultValues?: Partial<ElementoTipo>
  onSubmit: (values: ElementoTipoFormValues) => void
  isPending: boolean
  onCancel: () => void
}

export function ElementoTipoForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: ElementoTipoFormProps) {
  const { data: especialidadesData, isLoading: cargandoEsp } = useGetEspecialidades()
  const especialidadOpts = (especialidadesData?.data ?? []).map((e) => ({
    value: e.id,
    label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre,
  }))

  const form = useForm<ElementoTipoFormValues>({
    resolver: zodResolver(elementoTipoSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      especialidadId: defaultValues?.especialidadId ?? "",
      horasAdicionalesDefault: defaultValues?.horasAdicionalesDefault ?? 0,
      impactoFactorDefault: defaultValues?.impactoFactorDefault ?? 1,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* Información general */}
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
                  <Input placeholder="Ej: Válvula de control" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="especialidadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especialidad</FormLabel>
                <FormControl>
                  <Combobox
                    options={especialidadOpts}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder={cargandoEsp ? "Cargando..." : "Seleccionar especialidad"}
                    searchPlaceholder="Buscar..."
                    emptyMessage="No hay especialidades. Cárgalas en Configuración → Especialidades."
                    disabled={isPending || cargandoEsp}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Valores por defecto */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Valores por defecto
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="horasAdicionalesDefault"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas adicionales</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={isPending}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="impactoFactorDefault"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factor de impacto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      disabled={isPending}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
