"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { elementoSchema, type ElementoFormInput, type ElementoFormValues } from "../schema"
import { PRIORIDAD, type Elemento } from "../types"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
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

interface ElementoFormProps {
  defaultValues?: Partial<Elemento>
  onSubmit: (values: ElementoFormValues) => void
  isPending: boolean
  onCancel: () => void
}

export function ElementoForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: ElementoFormProps) {
  const { data: sistemasData, isLoading: loadingSistemas } = useGetSistemasSelect()
  const { data: subSistemasData, isLoading: loadingSubSistemas } = useGetSubSistemasSelect()
  const { data: tiposData, isLoading: loadingTipos } = useGetElementosTiposSelect()
  const { data: especialidadesData } = useGetEspecialidades()

  const tipos = (tiposData as any)?.data ?? []
  const especialidades = especialidadesData?.data ?? []

  const ALL_ESP = "__all__"
  // Helper UI: filtra el listado de tipos. NO se manda al backend (la especialidad
  // queda implícita por la del tipo elegido).
  const [especialidadId, setEspecialidadId] = useState<string>(ALL_ESP)

  const form = useForm<ElementoFormInput, any, ElementoFormValues>({
    resolver: zodResolver(elementoSchema),
    defaultValues: {
      tag: defaultValues?.tag ?? "",
      nombre: defaultValues?.nombre ?? "",
      elementoTipoId: defaultValues?.elementoTipoId ?? "",
      prioridad: defaultValues?.prioridad ?? 2,
      sistemaId: defaultValues?.sistemaId ?? "",
      subSistemaId: defaultValues?.subSistemaId ?? "",
      horasAdicionales: defaultValues?.horasAdicionales ?? 0,
      impactoFactor: defaultValues?.impactoFactor ?? 1,
      pid: defaultValues?.pid ?? "",
      testpack: defaultValues?.testpack ?? "",
      observaciones: defaultValues?.observaciones ?? "",
    },
  })

  // Si hay un elementoTipoId pre-cargado (edit), inicializar la especialidad
  // con la del tipo correspondiente para que el filtro tenga sentido al abrir.
  useEffect(() => {
    const currentTipoId = form.getValues("elementoTipoId")
    if (currentTipoId && tipos.length > 0 && especialidadId === ALL_ESP) {
      const tipo = tipos.find((t: any) => t.id === currentTipoId)
      if (tipo?.especialidadId) setEspecialidadId(tipo.especialidadId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipos.length])

  // Tipos filtrados según la especialidad
  const tiposFiltrados = useMemo(() => {
    if (especialidadId === ALL_ESP) return tipos
    return (tipos as Array<{ id: string; nombre: string; especialidadId?: string }>)
      .filter((t) => t.especialidadId === especialidadId)
  }, [tipos, especialidadId])

  const tipoOptions = useMemo(
    () => (tiposFiltrados as Array<{ id: string; nombre: string }>).map((t) => ({ value: t.id, label: t.nombre })),
    [tiposFiltrados]
  )

  const selectedSistemaId = useWatch({ control: form.control, name: "sistemaId" })

  const subSistemasFiltrados = subSistemasData?.data.filter(
    (ss) => !selectedSistemaId || ss.sistemaId === selectedSistemaId
  ) ?? []

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* Clasificación */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Clasificación
          </p>

          <FormField
            control={form.control}
            name="sistemaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sistema</FormLabel>
                <Select
                  disabled={isPending || loadingSistemas}
                  onValueChange={(v) => {
                    if (v) {
                      field.onChange(v)
                      form.setValue("subSistemaId", "")
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSistemas ? "Cargando..." : "Seleccioná un sistema"}>
                        {sistemasData?.data.find((s) => s.id === field.value)?.nombre
                          ?? (loadingSistemas ? "Cargando..." : "Seleccioná un sistema")}
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
            name="subSistemaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subsistema</FormLabel>
                <Select
                  disabled={isPending || loadingSubSistemas || !selectedSistemaId}
                  onValueChange={(v) => v && field.onChange(v)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedSistemaId ? "Seleccioná un sistema primero" : "Seleccioná un subsistema"}>
                        {subSistemasData?.data.find((s) => s.id === field.value)?.nombre
                          ?? (!selectedSistemaId ? "Seleccioná un sistema primero" : "Seleccioná un subsistema")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subSistemasFiltrados.map((ss) => (
                      <SelectItem key={ss.id} value={ss.id}>
                        {ss.codigo} — {ss.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Especialidad: helper de UI para filtrar el listado de tipos. NO se envía al backend. */}
          <FormItem>
            <FormLabel>Especialidad</FormLabel>
            <Select
              disabled={isPending || loadingTipos}
              value={especialidadId}
              onValueChange={(v) => {
                const value = v ?? ALL_ESP
                setEspecialidadId(value)
                // Si el tipo seleccionado dejó de pertenecer a la nueva especialidad, lo limpiamos.
                const currentTipoId = form.getValues("elementoTipoId")
                if (value !== ALL_ESP && currentTipoId) {
                  const tipo = tipos.find((t: any) => t.id === currentTipoId)
                  if (tipo?.especialidadId !== value) form.setValue("elementoTipoId", "")
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las especialidades">
                  {especialidadId === ALL_ESP
                    ? "Todas las especialidades"
                    : especialidades.find((e) => e.id === especialidadId)?.nombre ?? "—"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ESP}>Todas las especialidades</SelectItem>
                {especialidades.map((esp) => (
                  <SelectItem key={esp.id} value={esp.id}>
                    {esp.codigo ? `${esp.codigo} — ${esp.nombre}` : esp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                      loadingTipos
                        ? "Cargando..."
                        : especialidadId === ALL_ESP
                          ? "Buscar entre todos los tipos..."
                          : `Buscar en ${especialidades.find((e) => e.id === especialidadId)?.nombre ?? "esta especialidad"}...`
                    }
                    searchPlaceholder="Escribir para filtrar..."
                    emptyMessage={especialidadId === ALL_ESP ? "Sin tipos disponibles" : "Sin tipos para esta especialidad"}
                    disabled={isPending || loadingTipos}
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
                  onValueChange={(v) => v && field.onChange(parseInt(v, 10))}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná una prioridad">
                        {PRIORIDAD[field.value as keyof typeof PRIORIDAD] ?? "Seleccioná una prioridad"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(PRIORIDAD).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Identificación */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Identificación
          </p>

          <FormField
            control={form.control}
            name="tag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TAG</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: V-1001" disabled={isPending} {...field} />
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
                  <Input placeholder="Ej: Válvula de control" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PID <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="Ej: P&ID-001" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="testpack"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Testpack <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="Ej: TP-001" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Parámetros */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Parámetros
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="horasAdicionales"
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
              name="impactoFactor"
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
                    rows={3}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
