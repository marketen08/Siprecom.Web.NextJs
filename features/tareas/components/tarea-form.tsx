"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { tareaSchema, type TareaFormValues } from "../schema"
import { PRIORIDAD } from "../types"
import type { Tarea } from "../types"

import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetPlanillasSelect } from "@/features/planillas/api/use-get-planillas-select"
import { useGetProcedimientosSelect } from "@/features/procedimientos/api/use-get-procedimientos-select"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
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
  const { data: especialidadesData } = useGetEspecialidades()
  const { data: nivelesData, isLoading: loadingNiveles } = useGetNivelesSelect()
  const { data: planillasData, isLoading: loadingPlanillas } = useGetPlanillasSelect()
  const { data: procedimientosData, isLoading: loadingProcedimientos } = useGetProcedimientosSelect()

  const tipos = (tiposData as any)?.data ?? []
  const especialidades = especialidadesData?.data ?? []
  const niveles = (nivelesData as any)?.data ?? (Array.isArray(nivelesData) ? nivelesData : [])
  const planillas = (planillasData as any)?.data ?? []
  const procedimientos = (procedimientosData as any)?.data ?? []

  // Especialidad seleccionada (requerida). Helper de UI: filtra el listado de
  // tipos. NO se manda al backend (queda implícita por el tipo elegido).
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [especialidadError, setEspecialidadError] = useState<string | null>(null)

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

  // Si hay un elementoTipoId pre-cargado (clonar/editar), inicializar la especialidad
  // con la del tipo correspondiente para que el filtro tenga sentido al abrir el form.
  useEffect(() => {
    const currentTipoId = form.getValues("elementoTipoId")
    if (currentTipoId && tipos.length > 0 && !especialidadId) {
      const tipo = tipos.find((t: any) => t.id === currentTipoId)
      if (tipo?.especialidadId) setEspecialidadId(tipo.especialidadId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipos.length])

  // Tipos filtrados según la especialidad seleccionada (vacío hasta elegir una).
  const tiposFiltrados = useMemo(() => {
    if (!especialidadId) return []
    return (tipos as Array<{ id: string; nombre: string; especialidadId?: string }>)
      .filter((t) => t.especialidadId === especialidadId)
  }, [tipos, especialidadId])

  const tipoOptions = useMemo(
    () => (tiposFiltrados as Array<{ id: string; nombre: string }>).map((t) => ({ value: t.id, label: t.nombre })),
    [tiposFiltrados]
  )

  const handleSubmit = (values: TareaFormValues) => {
    if (!especialidadId) {
      setEspecialidadError("La especialidad es requerida")
      return
    }
    onSubmit({
      ...values,
      procedimientoId: values.procedimientoId || undefined,
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
                    <Input
                      type="number"
                      placeholder="100"
                      disabled={isPending}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
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
            {/* Especialidad: requerida. Helper de UI para filtrar el listado de
                tipos. NO se envía al backend (queda implícita por el tipo elegido). */}
            <FormItem>
              <FormLabel>Especialidad</FormLabel>
              <Select
                disabled={isPending || loadingTipos}
                value={especialidadId}
                onValueChange={(v) => {
                  if (!v) return
                  setEspecialidadId(v)
                  setEspecialidadError(null)
                  // Si el tipo seleccionado dejó de pertenecer a la nueva especialidad, lo limpiamos.
                  const currentTipoId = form.getValues("elementoTipoId")
                  if (currentTipoId) {
                    const tipo = tipos.find((t: any) => t.id === currentTipoId)
                    if (tipo?.especialidadId !== v) form.setValue("elementoTipoId", "")
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una especialidad">
                    {especialidadId
                      ? especialidades.find((e) => e.id === especialidadId)?.nombre ?? "—"
                      : "Seleccioná una especialidad"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp.id} value={esp.id}>
                      {esp.codigo ? `${esp.codigo} — ${esp.nombre}` : esp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {especialidadError && (
                <p className="text-sm font-medium text-destructive">{especialidadError}</p>
              )}
            </FormItem>

            <FormField
              control={form.control}
              name="elementoTipoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de elemento</FormLabel>
                  <FormControl>
                    <Combobox
                      options={tipoOptions}
                      value={field.value || ""}
                      onChange={(v) => field.onChange(v)}
                      placeholder={
                        !especialidadId
                          ? "Seleccioná una especialidad primero"
                          : `Buscar en ${especialidades.find((e) => e.id === especialidadId)?.nombre ?? "esta especialidad"}...`
                      }
                      searchPlaceholder="Escribir para filtrar..."
                      emptyMessage={!especialidadId ? "Seleccioná una especialidad primero" : "Sin tipos para esta especialidad"}
                      disabled={isPending || loadingTipos || !especialidadId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <FormField
            control={form.control}
            name="planillaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Planilla</FormLabel>
                <FormControl>
                  <Combobox
                    options={[
                      { value: "", label: "Ninguna" },
                      ...planillas.map((p: any) => ({ value: p.id, label: p.nombre })),
                    ]}
                    value={field.value || ""}
                    onChange={(v) => field.onChange(v)}
                    placeholder="Ninguna"
                    searchPlaceholder="Buscar planilla..."
                    emptyMessage="Sin planillas"
                    disabled={isPending || loadingPlanillas}
                  />
                </FormControl>
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
                <FormControl>
                  <Combobox
                    options={[
                      { value: "", label: "Ninguno" },
                      ...procedimientos.map((p: any) => ({ value: p.id, label: p.nombre })),
                    ]}
                    value={field.value || ""}
                    onChange={(v) => field.onChange(v)}
                    placeholder="Ninguno"
                    searchPlaceholder="Buscar procedimiento..."
                    emptyMessage="Sin procedimientos"
                    disabled={isPending || loadingProcedimientos}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
