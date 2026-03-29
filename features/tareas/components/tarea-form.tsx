"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { tareaSchema, type TareaFormValues } from "../schema"
import { PRIORIDAD } from "../types"
import type { Tarea } from "../types"

import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetPlanillasSelect } from "@/features/planillas/api/use-get-planillas-select"
import { useGetProcedimientosSelect } from "@/features/procedimientos/api/use-get-procedimientos-select"

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
import { Separator } from "@/components/ui/separator"

interface TareaFormProps {
  defaultValues?: Partial<Tarea>
  onSubmit: (values: TareaFormValues) => void
  isPending: boolean
  onCancel: () => void
}

const NONE = "__none__"

export function TareaForm({ defaultValues, onSubmit, isPending, onCancel }: TareaFormProps) {
  const { data: tiposData, isLoading: loadingTipos } = useGetElementosTiposSelect()
  const { data: nivelesData, isLoading: loadingNiveles } = useGetNivelesSelect()
  const { data: planillasData, isLoading: loadingPlanillas } = useGetPlanillasSelect()
  const { data: procedimientosData, isLoading: loadingProcedimientos } = useGetProcedimientosSelect()

  const tipos = (tiposData as any)?.data ?? []
  const niveles = (nivelesData as any)?.data ?? (Array.isArray(nivelesData) ? nivelesData : [])
  const planillas = (planillasData as any)?.data ?? []
  const procedimientos = (procedimientosData as any)?.data ?? []

  const form = useForm<TareaFormValues>({
    resolver: zodResolver(tareaSchema),
    defaultValues: {
      codigo: defaultValues?.codigo ?? 0,
      nombre: defaultValues?.nombre ?? "",
      elementoTipoId: defaultValues?.elementoTipoId ?? "",
      nivelId: defaultValues?.nivelId ?? "",
      planillaId: defaultValues?.planillaId ?? "",
      procedimientoId: defaultValues?.procedimientoId ?? "",
      prioridad: defaultValues?.prioridad ?? 2,
      horasBase: defaultValues?.horasBase ?? 0,
      impactoBase: defaultValues?.impactoBase ?? 0,
    },
  })

  const handleSubmit = (values: TareaFormValues) => {
    onSubmit({
      ...values,
      elementoTipoId: values.elementoTipoId === NONE ? undefined : values.elementoTipoId || undefined,
      nivelId: values.nivelId === NONE ? undefined : values.nivelId || undefined,
      planillaId: values.planillaId === NONE ? undefined : values.planillaId || undefined,
      procedimientoId: values.procedimientoId === NONE ? undefined : values.procedimientoId || undefined,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">

        {/* General */}
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
                    <Input type="number" placeholder="100" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prioridad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad</FormLabel>
                  <Select
                    disabled={isPending}
                    value={String(field.value)}
                    onValueChange={(v) => v && field.onChange(parseInt(v, 10))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná una prioridad">
                          {PRIORIDAD[field.value as keyof typeof PRIORIDAD] ?? "Seleccioná una prioridad"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRIORIDAD).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Input placeholder="Ej: Inspección visual de transformador" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Asociaciones */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Asociaciones
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="elementoTipoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de elemento</FormLabel>
                  <Select
                    disabled={isPending || loadingTipos}
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguno">
                          {tipos.find((t: any) => t.id === field.value)?.nombre ?? "Ninguno"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Ninguno</SelectItem>
                      {tipos.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nivelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel</FormLabel>
                  <Select
                    disabled={isPending || loadingNiveles}
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguno">
                          {niveles.find((n: any) => n.id === field.value)?.nombre ?? "Ninguno"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Ninguno</SelectItem>
                      {niveles.map((n: any) => (
                        <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="planillaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planilla</FormLabel>
                  <Select
                    disabled={isPending || loadingPlanillas}
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguna">
                          {planillas.find((p: any) => p.id === field.value)?.nombre ?? "Ninguna"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Ninguna</SelectItem>
                      {planillas.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="procedimientoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedimiento</FormLabel>
                  <Select
                    disabled={isPending || loadingProcedimientos}
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguno">
                          {procedimientos.find((p: any) => p.id === field.value)?.nombre ?? "Ninguno"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Ninguno</SelectItem>
                      {procedimientos.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Valores base */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Valores base
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="horasBase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas base</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
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
              name="impactoBase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impacto base</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
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

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1 bg-blue-900 hover:bg-blue-800">
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">
            Cancelar
          </Button>
        </div>

      </form>
    </Form>
  )
}
