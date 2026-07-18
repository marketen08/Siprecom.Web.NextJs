"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { tareaSchema, type TareaFormValues } from "../schema"
import {
  CALCULO_PROXIMA_FECHA,
  CALCULO_PROXIMA_FECHA_LABEL,
  PRIORIDAD,
} from "../types"
import type { Tarea } from "../types"

import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetPlanillasSelect } from "@/features/planillas/api/use-get-planillas-select"
import { useGetProcedimientosSelect } from "@/features/procedimientos/api/use-get-procedimientos-select"
import { useGetTareasSelect } from "@/features/tareas/api/use-get-tareas-select"

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
  const { data: tareasData, isLoading: loadingTareas } = useGetTareasSelect()

  const tipos = (tiposData as any)?.data ?? []
  const especialidades = especialidadesData?.data ?? []
  const niveles = (nivelesData as any)?.data ?? (Array.isArray(nivelesData) ? nivelesData : [])
  // Las planillas de encabezado son sólo para el header del TG (van en el
  // ElementoTipo sintético). Excluimos del select de tareas comunes, pero
  // dejamos pasar la que ya tenía asignada para no borrar la selección al editar.
  const planillas = ((planillasData as any)?.data ?? []).filter(
    (p: any) => !p.esEncabezadoTG || p.id === defaultValues?.planillaId,
  )
  const procedimientos = (procedimientosData as any)?.data ?? []
  const tareasCatalogo = (tareasData as any)?.data ?? []

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
      horasBase: defaultValues?.horasBase ?? 4,
      impactoBase: defaultValues?.impactoBase ?? 1,
      tipoAsignacion: defaultValues?.tipoAsignacion ?? 1,
      tareaPrecedenteId: defaultValues?.tareaPrecedenteId ?? null,
      lagDias: defaultValues?.lagDias ?? 0,
      esPreservacion: defaultValues?.esPreservacion ?? false,
      periodoSemanas: defaultValues?.periodoSemanas ?? null,
      calculoProximaFecha: defaultValues?.calculoProximaFecha ?? CALCULO_PROXIMA_FECHA.DesdeCompletado,
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

  // Opciones de tarea precedente: solo tareas del catálogo con MISMO ElementoTipo,
  // menos la propia (si estamos editando). Ciclos transitivos los valida el backend —
  // acá no calculamos la cadena inversa.
  //
  // El filtro por ElementoTipoId es la restricción crítica: la dependencia solo
  // se materializa cuando ambas tareas coexisten en el mismo elemento, y un
  // elemento tiene un único tipo. Cross-tipo era un no-op silencioso.
  const elementoTipoIdActual = form.watch("elementoTipoId")

  const tareaPrecedenteOptions = useMemo(() => {
    const currentId = defaultValues?.id
    if (!elementoTipoIdActual) return [{ value: "", label: "Ninguna" }]

    return [
      { value: "", label: "Ninguna" },
      ...(tareasCatalogo as Array<{
        id: string
        codigo: number
        nombre: string
        elementoTipoId?: string
      }>)
        .filter((t) => (!currentId || t.id !== currentId)
          && t.elementoTipoId === elementoTipoIdActual)
        .map((t) => ({
          value: t.id,
          label: `${t.codigo} — ${t.nombre}`,
        })),
    ]
  }, [tareasCatalogo, defaultValues?.id, elementoTipoIdActual])

  // Si cambia el ElementoTipo, limpiamos el precedente para que no quede apuntando
  // a una tarea que dejó de ser compatible.
  useEffect(() => {
    const actual = form.getValues("tareaPrecedenteId")
    if (!actual) return
    const sigueValida = (tareasCatalogo as Array<{ id: string; elementoTipoId?: string }>)
      .some((t) => t.id === actual && t.elementoTipoId === elementoTipoIdActual)
    if (!sigueValida) {
      form.setValue("tareaPrecedenteId", null)
      form.setValue("lagDias", 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementoTipoIdActual])

  // Preservación no aplica a ElementoTipos sintéticos: las tareas del tipo
  // sintético corren sobre el elemento sintético del TG, y los packs se
  // ejecutan una vez (no soportan ciclos recurrentes).
  const tipoElegido = (tipos as Array<{ id: string; esSintetico?: boolean }>).find(
    (t) => t.id === elementoTipoIdActual,
  )
  const tipoEsSintetico = tipoElegido?.esSintetico === true
  useEffect(() => {
    if (!tipoEsSintetico) return
    if (form.getValues("esPreservacion")) form.setValue("esPreservacion", false)
    if (form.getValues("periodoSemanas") != null) form.setValue("periodoSemanas", null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoEsSintetico])

  // Cuántas tareas del mismo tipo hay (excluyendo la propia). Si son 0, el
  // combobox se muestra deshabilitado con un hint — sino el usuario queda
  // buscando por qué el listado está vacío.
  const cantidadOtrasTareas = Math.max(0, tareaPrecedenteOptions.length - 1)

  const handleSubmit = (values: TareaFormValues) => {
    if (!especialidadId) {
      setEspecialidadError("La especialidad es requerida")
      return
    }
    // Si no hay precedente, forzamos lagDias=0 y limpiamos el id.
    const precedenteId = values.tareaPrecedenteId || null
    // Si no es de preservación, limpiamos periodo (no aplica) pero mantenemos
    // el calculoProximaFecha default para no marear al backend.
    onSubmit({
      ...values,
      procedimientoId: values.procedimientoId || undefined,
      tareaPrecedenteId: precedenteId,
      lagDias: precedenteId ? values.lagDias : 0,
      periodoSemanas: values.esPreservacion ? values.periodoSemanas : null,
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
                      ...planillas.map((p: any) => ({
                        value: p.id,
                        label: p.codigo ? `${p.codigo} — ${p.nombre}` : p.nombre,
                      })),
                    ]}
                    value={field.value || ""}
                    onChange={(v) => field.onChange(v)}
                    placeholder="Ninguna"
                    searchPlaceholder="Buscar por código o nombre..."
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

        <Separator />

        {/* Dependencia catalogal (opcional) */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dependencia
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Si esta tarea depende de otra dentro del <strong>mismo elemento</strong>, seleccionala
              acá. El sistema no permitirá empezar esta tarea hasta que se complete la precedente
              (+ los días de espera).
            </p>
          </div>

          <FormField
            control={form.control}
            name="tareaPrecedenteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarea precedente <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Combobox
                    options={tareaPrecedenteOptions}
                    value={field.value ?? ""}
                    onChange={(v) => field.onChange(v ? v : null)}
                    placeholder={
                      !elementoTipoIdActual
                        ? "Elegí primero el tipo de elemento"
                        : cantidadOtrasTareas === 0
                        ? "No hay otras tareas para este tipo"
                        : "Ninguna"
                    }
                    searchPlaceholder="Buscar por código o nombre..."
                    emptyMessage="Sin tareas compatibles"
                    disabled={isPending || loadingTareas
                      || !elementoTipoIdActual
                      || cantidadOtrasTareas === 0}
                  />
                </FormControl>
                {elementoTipoIdActual && cantidadOtrasTareas === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    No hay otras tareas cargadas en este tipo de elemento. Creá al menos una
                    antes de poder definir precedentes.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("tareaPrecedenteId") ? (
            <FormField
              control={form.control}
              name="lagDias"
              render={({ field }) => (
                <FormItem className="max-w-40">
                  <FormLabel>Días de espera</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      step={1}
                      disabled={isPending}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">
                    0 = arranca el día siguiente al fin del predecesor.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>

        <Separator />

        {/* Preservación (mantenimiento recurrente) */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preservación
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Si esta tarea se repite cada cierto tiempo (mantenimiento preventivo),
              activá esta opción. Al completar cada ciclo, el sistema genera automáticamente
              el próximo con la fecha correspondiente.
            </p>
          </div>

          <FormField
            control={form.control}
            name="esPreservacion"
            render={({ field }) => {
              const disabled = isPending || tipoEsSintetico
              return (
                <FormItem>
                  <label
                    className={`flex items-start gap-2 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                      checked={field.value}
                      disabled={disabled}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <span className="text-sm">
                      Esta tarea es de preservación (se repite en ciclos)
                    </span>
                  </label>
                  {tipoEsSintetico && (
                    <p className="text-[11px] text-muted-foreground pl-6">
                      No disponible para tipos sintéticos (test packs).
                      Los paquetes se ejecutan una vez y no soportan ciclos recurrentes.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )
            }}
          />

          {form.watch("esPreservacion") ? (
            <div className="flex flex-col gap-3 pl-6 border-l-2 border-blue-100">
              <FormField
                control={form.control}
                name="periodoSemanas"
                render={({ field }) => (
                  <FormItem className="max-w-48">
                    <FormLabel>Período (semanas)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={520}
                        step={1}
                        placeholder="Ej: 12"
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v === "" ? null : parseInt(v, 10) || null)
                        }}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      Entre 1 y 520 semanas (10 años). Ejemplos: 4 = mensual, 12 = trimestral, 52 = anual.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calculoProximaFecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cálculo de la próxima fecha</FormLabel>
                    <Select
                      disabled={isPending}
                      value={String(field.value ?? CALCULO_PROXIMA_FECHA.DesdeCompletado)}
                      onValueChange={(v) => v && field.onChange(parseInt(v, 10))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            {CALCULO_PROXIMA_FECHA_LABEL[Number(field.value)] ?? "Desde fecha de completado"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={String(CALCULO_PROXIMA_FECHA.DesdeCompletado)}>
                          Desde fecha de completado (fecha real de firma + período)
                        </SelectItem>
                        <SelectItem value={String(CALCULO_PROXIMA_FECHA.DesdePlanificada)}>
                          Desde fecha planificada (fecha planificada anterior + período)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}
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
