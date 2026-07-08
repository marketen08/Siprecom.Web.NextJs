"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { planillaSchema, type PlanillaFormValues } from "../schema"
import type { Planilla } from "../types"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** Valor sentinela para "Sin especialidad" en el Select — no se puede usar "" con shadcn/Base UI Select. */
const SIN_ESPECIALIDAD = "__none__"

interface PlanillaFormProps {
  defaultValues?: Partial<Planilla>
  onSubmit: (values: PlanillaFormValues) => void
  isPending: boolean
  onCancel: () => void
}

export function PlanillaForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: PlanillaFormProps) {
  const form = useForm<PlanillaFormValues>({
    resolver: zodResolver(planillaSchema),
    defaultValues: {
      codigo: defaultValues?.codigo ?? "",
      nombre: defaultValues?.nombre ?? "",
      descripcion: defaultValues?.descripcion ?? "",
      observaciones: defaultValues?.observaciones ?? "",
      version: defaultValues?.version ?? "1.0",
      requiereFirma: defaultValues?.requiereFirma ?? true,
      permiteAdjuntos: defaultValues?.permiteAdjuntos ?? true,
      generaPdfFinal: defaultValues?.generaPdfFinal ?? true,
      orientacionPdf: defaultValues?.orientacionPdf ?? 0,
      especialidadId: defaultValues?.especialidadId ?? null,
    },
  })

  const { data: especialidadesRaw } = useGetEspecialidades()
  const especialidades = especialidadesRaw?.data ?? []

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PLA-001"
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
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versión</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1.0"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Inspección de transformador"
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
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descripción de la planilla..."
                    disabled={isPending}
                    rows={3}
                    className="resize-none"
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
                    rows={2}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="especialidadId"
            render={({ field }) => {
              const currentValue = field.value ?? SIN_ESPECIALIDAD
              const especialidadSel = especialidades.find((e) => e.id === field.value)
              return (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <Select
                    value={currentValue}
                    onValueChange={(v) => field.onChange(v === SIN_ESPECIALIDAD ? null : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value
                            ? (especialidadSel?.nombre ?? "—")
                            : "Sin especialidad (aplica a todas)"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SIN_ESPECIALIDAD}>
                        Sin especialidad (aplica a todas)
                      </SelectItem>
                      {especialidades.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )
            }}
          />

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
              Opciones
            </p>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                {...form.register("requiereFirma")}
                disabled={isPending}
              />
              Requiere firma
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                {...form.register("permiteAdjuntos")}
                disabled={isPending}
              />
              Permite adjuntos
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                {...form.register("generaPdfFinal")}
                disabled={isPending}
              />
              Genera PDF final
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={form.watch("orientacionPdf") === 1}
                onChange={(e) => form.setValue("orientacionPdf", e.target.checked ? 1 : 0)}
                disabled={isPending}
              />
              PDF horizontal (apaisado)
            </label>
          </div>
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
