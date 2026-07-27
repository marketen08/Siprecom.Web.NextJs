"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { pendienteCreateSchema, type PendienteFormValues } from "../schema"
import {
  useGetPendienteAcciones,
  useGetPendienteCategorias,
  useGetPendienteMotivos,
  useGetPendienteTipos,
} from "../api/use-catalogos"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import { PRIORIDAD } from "../types"
import { Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Combobox } from "@/components/ui/combobox"
import { DescripcionAutocomplete } from "./descripcion-autocomplete"
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

interface PendienteFormProps {
  defaultValues?: Partial<PendienteFormValues>
  onSubmit: (values: PendienteFormValues) => void
  isPending: boolean
  onCancel: () => void
  /**
   * En modo edición el responsable no se puede cambiar desde este formulario
   * (va por el workflow "Asignar responsable"). Cuando es true, el campo
   * queda visible pero deshabilitado y con una nota aclaratoria.
   */
  readonlyResponsable?: boolean
}

const NONE = "__none__"

export function PendienteForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  readonlyResponsable = false,
}: PendienteFormProps) {
  const { data: perfil } = useGetPerfil()
  const { data: categoriasRaw } = useGetPendienteCategorias()
  const { data: tiposRaw } = useGetPendienteTipos()
  const { data: accionesRaw } = useGetPendienteAcciones()
  const { data: motivosRaw } = useGetPendienteMotivos()
  const { data: nivelesRaw } = useGetNivelesSelect()
  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subSistemasRaw } = useGetSubSistemasSelect()
  const { data: usuariosRaw } = useGetProyectoUsuarios(perfil?.proyectoId ?? null)
  const { data: especialidadesRaw } = useGetEspecialidades()

  const categorias = categoriasRaw?.data ?? []
  const tipos = tiposRaw?.data ?? []
  const acciones = accionesRaw?.data ?? []
  const motivos = motivosRaw?.data ?? []
  const niveles = nivelesRaw?.data ?? []
  const sistemas = sistemasRaw?.data ?? []
  const subSistemas = subSistemasRaw?.data ?? []
  const usuarios = usuariosRaw ?? []
  const especialidades = especialidadesRaw?.data ?? []

  const hoy = new Date()
  const en30dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)
  const fechaDefault = en30dias.toISOString().substring(0, 10)

  const form = useForm<PendienteFormValues>({
    resolver: zodResolver(pendienteCreateSchema),
    defaultValues: {
      categoriaId: defaultValues?.categoriaId ?? "",
      tipoId: defaultValues?.tipoId ?? "",
      responsableId: defaultValues?.responsableId ?? "",
      descripcion: defaultValues?.descripcion ?? "",
      prioridad: defaultValues?.prioridad ?? 2,
      fechaCierreEstimado: defaultValues?.fechaCierreEstimado ?? fechaDefault,
      subSistemaId: defaultValues?.subSistemaId ?? null,
      elementoId: defaultValues?.elementoId ?? null,
      especialidadId: defaultValues?.especialidadId ?? null,
      pid: defaultValues?.pid ?? null,
      circuito: defaultValues?.circuito ?? null,
      nivelId: defaultValues?.nivelId ?? null,
      accionId: defaultValues?.accionId ?? null,
      motivoId: defaultValues?.motivoId ?? null,
    },
  })

  // Wizard de descripción: cuando el user cambia Tipo, si el tipo tiene una
  // Categoría sugerida y el form todavía no tiene una categoría cargada, la
  // pre-seleccionamos. No sobreescribimos una elección manual — el user manda.
  const onTipoChange = (nuevoTipoId: string) => {
    form.setValue("tipoId", nuevoTipoId, { shouldDirty: true, shouldValidate: true })
    if (!nuevoTipoId) return
    const t = tipos.find((x) => x.id === nuevoTipoId)
    const catSug = t?.categoriaSugeridaId
    const catActual = form.getValues("categoriaId")
    if (catSug && !catActual) {
      form.setValue("categoriaId", catSug, { shouldDirty: true, shouldValidate: true })
    }
  }

  // Compone una descripción sugerida a partir de las 5 dimensiones del wizard.
  // Template: "[Acción] por [Motivo] — [Especialidad] · [Nivel] (Tipo: [Tipo])".
  // Los campos vacíos se omiten graciosamente. Se dispara con el botón de la
  // varita mágica y sobreescribe el textarea — el user puede seguir editando.
  const componerDescripcion = () => {
    const v = form.getValues()
    const accion = acciones.find((a) => a.id === v.accionId)?.nombre
    const motivo = motivos.find((m) => m.id === v.motivoId)?.nombre
    const especialidad = especialidades.find((e) => e.id === v.especialidadId)?.nombre
    const nivel = niveles.find((n) => n.id === v.nivelId)?.nombre
    const tipo = tipos.find((t) => t.id === v.tipoId)?.tipo
    const partes: string[] = []
    if (accion) partes.push(accion)
    if (motivo) partes.push(`por ${motivo}`)
    const izq = partes.join(" ")
    const contexto: string[] = []
    if (especialidad) contexto.push(especialidad)
    if (nivel) contexto.push(nivel)
    const der = contexto.join(" · ")
    let texto = [izq, der].filter(Boolean).join(" — ")
    if (tipo) texto = texto ? `${texto} (Tipo: ${tipo})` : `Tipo: ${tipo}`
    if (!texto.trim()) return
    form.setValue("descripcion", texto, { shouldDirty: true, shouldValidate: true })
  }

  // Watch subsistema + especialidad para filtrar elementos.
  const subSistemaIdActual = form.watch("subSistemaId")
  const especialidadIdActual = form.watch("especialidadId")
  const elementoIdActual = form.watch("elementoId")
  const { data: elementosRaw } = useGetElementos({
    page: 1,
    pageSize: 500,
    subSistemaId: subSistemaIdActual ?? undefined,
    especialidadId: especialidadIdActual ?? undefined,
  })
  const elementos = elementosRaw?.data ?? []

  // Si el usuario cambia la especialidad y el elemento actual ya no pertenece
  // a la nueva lista filtrada, lo limpiamos para no dejar un elemento "colgado"
  // que no matchea el criterio.
  useEffect(() => {
    if (!elementoIdActual) return
    if (elementos.length === 0) return
    if (!elementos.some((e) => e.id === elementoIdActual)) {
      form.setValue("elementoId", null, { shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadIdActual, subSistemaIdActual, elementos])

  // Al seleccionar un elemento con especialidad definida a nivel de ElementoTipo,
  // auto-populamos el campo de especialidad — evita al operador tener que
  // volver arriba y elegirla a mano. Si ya matchea, no hace nada.
  const onElementoChange = (nuevoElementoId: string | null) => {
    form.setValue("elementoId", nuevoElementoId, { shouldDirty: true })
    if (!nuevoElementoId) return
    const el = elementos.find((e) => e.id === nuevoElementoId)
    const espDelElemento = el?.elementoTipoEspecialidadId
    if (espDelElemento && espDelElemento !== especialidadIdActual) {
      form.setValue("especialidadId", espDelElemento, { shouldDirty: true })
    }
  }

  // Filtramos subsistemas por sistema (UI extra: select de sistema para acotar lista).
  const [sistemaId, setSistemaId] = useStateLike(defaultValues?.subSistemaId, subSistemas)
  const subSistemasFiltrados = useMemo(
    () => (sistemaId ? subSistemas.filter((ss) => ss.sistemaId === sistemaId) : subSistemas),
    [sistemas, subSistemas, sistemaId],
  )

  // Opciones para Combobox de elementos (búsqueda).
  const elementoOptions = useMemo(
    () => [
      { value: "", label: "Sin elemento asignado" },
      ...elementos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.nombre}` })),
    ],
    [elementos],
  )

  return (
    <Form {...form}>
      {/* pb-24 al form para que los botones sticky del footer no tapen el
          último campo cuando estamos scrolleando en mobile. */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 pb-24 sm:pb-4">
        {/* Datos principales */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información principal
          </p>

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Descripción</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-blue-700 hover:text-blue-800"
                    onClick={componerDescripcion}
                    disabled={isPending}
                    title="Componer descripción a partir del wizard (Acción, Motivo, Especialidad, Nivel, Tipo)"
                  >
                    <Wand2 className="mr-1 h-3.5 w-3.5" />
                    Componer desde wizard
                  </Button>
                </div>
                <FormControl>
                  <DescripcionAutocomplete
                    name={field.name}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí categoría">
                          {categorias.find((c) => c.id === field.value)?.nombre ?? "Elegí categoría"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && onTipoChange(v)} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí tipo">
                          {tipos.find((t) => t.id === field.value)?.tipo ?? "Elegí tipo"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="prioridad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => v && field.onChange(Number(v))}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>{PRIORIDAD[field.value] ?? "Prioridad"}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRIORIDAD).map(([id, nombre]) => (
                        <SelectItem key={id} value={id}>{nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fechaCierreEstimado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cierre estimado</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="responsableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsable</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                  disabled={isPending || readonlyResponsable}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Asignar a un usuario del proyecto">
                        {usuarios.find((u) => u.usuarioId === field.value)?.userName ?? "Asignar"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {usuarios.map((u) => (
                      <SelectItem key={u.usuarioId} value={u.usuarioId}>
                        {u.userName} — {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {readonlyResponsable && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Para reasignar, usá la acción de workflow en el detalle del pendiente.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Localización (opcional) */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Localización (opcional)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            {/* Sistema: no es un campo del form (solo filtra la lista de
                subsistemas). Usamos FormItem + Label sueltos para que las
                alturas y gaps queden idénticas a los FormField de al lado. */}
            <FormItem>
              <Label>Sistema</Label>
              <Select value={sistemaId || NONE} onValueChange={(v) => { const value = v ?? NONE; setSistemaId(value === NONE ? "" : value) }}>
                <SelectTrigger>
                  <SelectValue>
                    {sistemaId
                      ? sistemas.find((s) => s.id === sistemaId)?.nombre ?? "Sistema"
                      : "Todos"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todos</SelectItem>
                  {sistemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="subSistemaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subsistema</FormLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin subsistema">
                          {field.value
                            ? subSistemas.find((ss) => ss.id === field.value)?.nombre ?? "Subsistema"
                            : "Sin subsistema"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin subsistema</SelectItem>
                      {subSistemasFiltrados.map((ss) => (
                        <SelectItem key={ss.id} value={ss.id}>{ss.codigo} — {ss.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Especialidad primero: al elegirla se filtra la lista de elementos.
              Si el operador la deja vacía, la selección de un elemento con
              especialidad definida la auto-completa (ver onElementoChange). */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="especialidadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <FormControl>
                    <Combobox
                      options={especialidades.map((e) => ({
                        value: e.id,
                        label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre,
                      }))}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || null)}
                      placeholder="Seleccionar especialidad"
                      searchPlaceholder="Buscar..."
                      emptyMessage="No hay especialidades cargadas"
                      disabled={isPending}
                    />
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
                  <FormLabel>PID</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isPending}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="elementoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Elemento
                  {especialidadIdActual && (
                    <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                      (filtrado por especialidad)
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Combobox
                    options={elementoOptions}
                    value={field.value ?? ""}
                    onChange={(v) => onElementoChange(v || null)}
                    placeholder="Sin elemento asignado"
                    searchPlaceholder="Buscar elemento..."
                    emptyMessage="Sin resultados"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="circuito"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Circuito</FormLabel>
                <FormControl>
                  <Input
                    disabled={isPending}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Wizard de descripción — dimensiones catalogadas que ayudan a
            componer la descripción del pendiente. Cargar Nivel, Acción y
            Motivo, sumado a Especialidad + Tipo de arriba, alimenta al botón
            "Componer desde wizard" que autopobla el textarea. */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Wizard de descripción (opcional)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="nivelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel</FormLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin nivel">
                          {field.value
                            ? niveles.find((n) => n.id === field.value)?.nombre ?? "Nivel"
                            : "Sin nivel"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin nivel</SelectItem>
                      {niveles.map((n) => (
                        <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acción</FormLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin acción">
                          {field.value
                            ? acciones.find((a) => a.id === field.value)?.nombre ?? "Acción"
                            : "Sin acción"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin acción</SelectItem>
                      {acciones.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin motivo">
                          {field.value
                            ? motivos.find((m) => m.id === field.value)?.nombre ?? "Motivo"
                            : "Sin motivo"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin motivo</SelectItem>
                      {motivos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2">
            <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
            <div className="flex-1">
              <p className="text-xs text-blue-900">
                Cuando cargues estas dimensiones, usá <strong>&quot;Componer desde wizard&quot;</strong> arriba
                para autopoblar la descripción. Si elegís un <strong>Tipo</strong> con categoría sugerida,
                también se pre-selecciona la Categoría automáticamente.
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-6 p-0 mt-1 text-xs text-blue-800"
                onClick={componerDescripcion}
                disabled={isPending}
              >
                Componer ahora
              </Button>
            </div>
          </div>
        </div>

        {/* Botones — sticky al bottom del viewport en mobile para que el user
            no tenga que scrollear hasta el final del form largo para guardar.
            En desktop quedan como fila normal al final. En mobile Guardar
            primero (más ancho) porque es la acción primaria. Respeta safe-area
            del iPhone. */}
        <div
          className="fixed sm:relative inset-x-0 bottom-0 z-10 flex flex-row-reverse sm:flex-row gap-3 border-t border-border bg-background/95 px-4 py-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-2 backdrop-blur supports-backdrop-filter:sm:backdrop-blur-none"
          style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))` }}
        >
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 h-11 sm:h-10 bg-blue-900 hover:bg-blue-800"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-11 sm:h-10"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  )
}

// Mini-helper para state local del select de sistema (no afecta el formulario).
import { useState } from "react"
function useStateLike(
  initialSubSistemaId: string | null | undefined,
  subsistemas: Array<{ id: string; sistemaId: string }>,
) {
  const inferido = initialSubSistemaId
    ? subsistemas.find((ss) => ss.id === initialSubSistemaId)?.sistemaId ?? ""
    : ""
  const [val, setVal] = useState<string>(inferido)
  // Si llegan nuevos subsistemas y todavía no había inferencia, intentamos inferir de nuevo.
  useEffect(() => {
    if (!val && initialSubSistemaId) {
      const ss = subsistemas.find((s) => s.id === initialSubSistemaId)
      if (ss?.sistemaId) setVal(ss.sistemaId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsistemas.length, initialSubSistemaId])
  return [val, setVal] as const
}
