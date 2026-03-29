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

interface TareaFormProps {
  defaultValues?: Partial<Tarea>
  onSubmit: (values: TareaFormValues) => void
  isPending: boolean
  onCancel: () => void
}

const EMPTY = "__none__"

export function TareaForm({ defaultValues, onSubmit, isPending, onCancel }: TareaFormProps) {
  const { data: tiposResult } = useGetElementosTiposSelect()
  const { data: nivelesResult } = useGetNivelesSelect()
  const { data: planillasResult } = useGetPlanillasSelect()
  const { data: procedimientosResult } = useGetProcedimientosSelect()

  const tipos = (tiposResult as any)?.data ?? []
  const niveles = (nivelesResult as any)?.data ?? nivelesResult ?? []
  const planillas = (planillasResult as any)?.data ?? []
  const procedimientos = (procedimientosResult as any)?.data ?? []

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
      elementoTipoId: values.elementoTipoId === EMPTY ? undefined : values.elementoTipoId,
      nivelId: values.nivelId === EMPTY ? undefined : values.nivelId,
      planillaId: values.planillaId === EMPTY ? undefined : values.planillaId,
      procedimientoId: values.procedimientoId === EMPTY ? undefined : values.procedimientoId,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">

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
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
                    value={field.value || EMPTY}
                    onValueChange={(v) => field.onChange(v === EMPTY ? "" : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EMPTY}>Ninguno</SelectItem>
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
                    value={field.value || EMPTY}
                    onValueChange={(v) => field.onChange(v === EMPTY ? "" : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EMPTY}>Ninguno</SelectItem>
                      {(Array.isArray(niveles) ? niveles : []).map((n: any) => (
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
                    value={field.value || EMPTY}
                    onValueChange={(v) => field.onChange(v === EMPTY ? "" : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguna" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EMPTY}>Ninguna</SelectItem>
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
                    value={field.value || EMPTY}
                    onValueChange={(v) => field.onChange(v === EMPTY ? "" : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EMPTY}>Ninguno</SelectItem>
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
                    <Input type="number" step="0.01" placeholder="0" disabled={isPending} {...field} />
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
                    <Input type="number" step="0.01" placeholder="0" disabled={isPending} {...field} />
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
