"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Wand2 } from "lucide-react"

import { makePendienteCreateSchema, type PendienteFormValues } from "../schema"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import {
  useGetPendienteAcciones,
  useGetPendienteCategorias,
  useGetPendienteMotivos,
  useGetPendienteTipos,
} from "../api/use-catalogos"
import { useResolverPendienteCatalogo } from "../api/use-catalogo-maestro"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import { PRIORIDAD } from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const { data: proyectoRaw } = useGetProyecto(perfil?.proyectoId ?? null)
  const elementoRequerido = proyectoRaw?.data?.funcionalidadesEfectivas?.PENDIENTE_ELEMENTO_REQUERIDO === true
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

  // Schema condicional: Elemento pasa a requerido si el proyecto tiene el
  // feature flag PENDIENTE_ELEMENTO_REQUERIDO activo. `useMemo` para no
  // recrear el resolver en cada render.
  const schema = useMemo(() => makePendienteCreateSchema(elementoRequerido), [elementoRequerido])

  const form = useForm<PendienteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nivelId: defaultValues?.nivelId ?? "",
      especialidadId: defaultValues?.especialidadId ?? "",
      tipoId: defaultValues?.tipoId ?? "",
      accionId: defaultValues?.accionId ?? "",
      motivoId: defaultValues?.motivoId ?? "",
      categoriaId: defaultValues?.categoriaId ?? "",
      descripcion: defaultValues?.descripcion ?? "",
      responsableId: defaultValues?.responsableId ?? "",
      fechaCierreEstimado: defaultValues?.fechaCierreEstimado ?? fechaDefault,
      prioridad: defaultValues?.prioridad ?? 2,
      subSistemaId: defaultValues?.subSistemaId ?? "",
      elementoId: defaultValues?.elementoId ?? (elementoRequerido ? "" : null),
      pid: defaultValues?.pid ?? null,
    },
  })

  // Watch de las 5 dimensiones del wizard.
  const nivelId = form.watch("nivelId")
  const especialidadId = form.watch("especialidadId")
  const tipoId = form.watch("tipoId")
  const accionId = form.watch("accionId")
  const motivoId = form.watch("motivoId")

  // Consulta al catálogo maestro. Sólo dispara cuando las 5 están cargadas.
  const dimensionesCompletas = Boolean(nivelId && especialidadId && tipoId && accionId && motivoId)
  const resolver = useResolverPendienteCatalogo(
    dimensionesCompletas ? { nivelId, especialidadId, tipoId, accionId, motivoId } : null,
  )

  // Componer descripción con template — se usa como fallback cuando no hay
  // match del catálogo maestro. También queda expuesto en un botón para que
  // el user pueda re-componer manualmente si edita alguna dimensión.
  const componerFallback = () => {
    const accion = acciones.find((a) => a.id === accionId)?.nombre
    const motivo = motivos.find((m) => m.id === motivoId)?.nombre
    const especialidad = especialidades.find((e) => e.id === especialidadId)?.nombre
    const nivel = niveles.find((n) => n.id === nivelId)?.nombre
    const tipo = tipos.find((t) => t.id === tipoId)?.tipo
    const izq = [accion, motivo ? `por ${motivo}` : null].filter(Boolean).join(" ")
    const der = [especialidad, nivel].filter(Boolean).join(" · ")
    let texto = [izq, der].filter(Boolean).join(" — ")
    if (tipo) texto = texto ? `${texto} (Tipo: ${tipo})` : `Tipo: ${tipo}`
    return texto.trim()
  }

  // Marcadores de qué llenamos automáticamente para no pisar edición manual.
  // Guardamos la firma "descripción auto" para saber si el textarea sigue
  // teniendo lo que autogeneramos (podemos sobreescribir sin miedo) o si el
  // usuario ya lo tocó (respetamos su cambio).
  const ultimaDescripcionAuto = useRef<string>("")
  const ultimaCategoriaAuto = useRef<string>("")

  // Reacción a cambios de las 5 dimensiones:
  //  - si hay match del catálogo → autopobla desc + categoría
  //  - si NO hay match → compone descripción con template + deja categoría vacía
  //    (o la sugerida del Tipo si existiera)
  useEffect(() => {
    if (!dimensionesCompletas) return

    const descripcionActual = form.getValues("descripcion")
    const categoriaActual = form.getValues("categoriaId")

    // Solo sobreescribimos si el textarea/categoría todavía tiene lo que
    // pusimos nosotros (o está vacío) — respetamos edición manual.
    const descripcionEsDelWizard = !descripcionActual || descripcionActual === ultimaDescripcionAuto.current
    const categoriaEsDelWizard = !categoriaActual || categoriaActual === ultimaCategoriaAuto.current

    if (resolver.isLoading) return

    if (resolver.data) {
      // Match encontrado → aplica lo del catálogo.
      if (descripcionEsDelWizard) {
        form.setValue("descripcion", resolver.data.descripcion, { shouldValidate: true, shouldDirty: true })
        ultimaDescripcionAuto.current = resolver.data.descripcion
      }
      if (categoriaEsDelWizard && resolver.data.categoriaId) {
        form.setValue("categoriaId", resolver.data.categoriaId, { shouldValidate: true, shouldDirty: true })
        ultimaCategoriaAuto.current = resolver.data.categoriaId
      }
    } else {
      // Sin match → fallback compose. Categoría: usa la CategoriaSugerida del Tipo si existe.
      const texto = componerFallback()
      if (texto && descripcionEsDelWizard) {
        form.setValue("descripcion", texto, { shouldValidate: true, shouldDirty: true })
        ultimaDescripcionAuto.current = texto
      }
      const t = tipos.find((x) => x.id === tipoId)
      if (t?.categoriaSugeridaId && categoriaEsDelWizard) {
        form.setValue("categoriaId", t.categoriaSugeridaId, { shouldValidate: true, shouldDirty: true })
        ultimaCategoriaAuto.current = t.categoriaSugeridaId
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelId, especialidadId, tipoId, accionId, motivoId, resolver.data, resolver.isLoading])

  // ── Localización ────────────────────────────────────────────────
  const subSistemaIdActual = form.watch("subSistemaId")
  const elementoIdActual = form.watch("elementoId")
  const { data: elementosRaw } = useGetElementos({
    page: 1,
    pageSize: 500,
    subSistemaId: subSistemaIdActual ?? undefined,
    especialidadId: especialidadId || undefined,
  })
  const elementos = elementosRaw?.data ?? []

  // Si el elemento actual ya no matchea la lista filtrada, lo limpiamos.
  useEffect(() => {
    if (!elementoIdActual) return
    if (elementos.length === 0) return
    if (!elementos.some((e) => e.id === elementoIdActual)) {
      form.setValue("elementoId", null, { shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId, subSistemaIdActual, elementos])

  // Al elegir un elemento con especialidad definida a nivel de ElementoTipo,
  // auto-populamos el campo especialidad si el user no lo tiene cargado.
  const onElementoChange = (nuevoElementoId: string | null) => {
    form.setValue("elementoId", nuevoElementoId, { shouldDirty: true })
    if (!nuevoElementoId) return
    const el = elementos.find((e) => e.id === nuevoElementoId)
    const espDelElemento = el?.elementoTipoEspecialidadId
    if (espDelElemento && espDelElemento !== especialidadId) {
      form.setValue("especialidadId", espDelElemento, { shouldDirty: true, shouldValidate: true })
    }
  }

  const [sistemaId, setSistemaId] = useStateLike(defaultValues?.subSistemaId, subSistemas)
  const subSistemasFiltrados = useMemo(
    () => (sistemaId ? subSistemas.filter((ss) => ss.sistemaId === sistemaId) : subSistemas),
    [sistemas, subSistemas, sistemaId],
  )
  const elementoOptions = useMemo(
    () => [
      { value: "", label: "Sin elemento asignado" },
      ...elementos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.nombre}` })),
    ],
    [elementos],
  )

  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 pb-24 sm:pb-4">
        {/* ── Wizard de descripción ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Wizard de descripción
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completá las 5 dimensiones. Si hay una descripción cargada en el catálogo se autopobla;
                sino, se arma con un template editable.
              </p>
            </div>
            {dimensionesCompletas && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  resolver.isLoading
                    ? "bg-gray-100 text-gray-700"
                    : resolver.data
                    ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                    : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                }`}
              >
                {resolver.isLoading ? "Buscando..." : resolver.data ? "Match catálogo" : "Sin match — template"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="nivelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel *</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí nivel">
                          {niveles.find((n) => n.id === field.value)?.nombre ?? "Elegí nivel"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
              name="especialidadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={especialidades.map((e) => ({
                        value: e.id,
                        label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre,
                      }))}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || "")}
                      placeholder="Elegí especialidad"
                      searchPlaceholder="Buscar..."
                      emptyMessage="Sin especialidades"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isPending}>
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

            <FormField
              control={form.control}
              name="accionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acción *</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí acción">
                          {acciones.find((a) => a.id === field.value)?.nombre ?? "Elegí acción"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                  <FormLabel>Motivo *</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí motivo">
                          {motivos.find((m) => m.id === field.value)?.nombre ?? "Elegí motivo"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
        </div>

        <Separator />

        {/* ── Descripción + Categoría (editables) ── */}
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Descripción *</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-blue-700 hover:text-blue-800"
                    onClick={() => {
                      const texto = componerFallback()
                      if (!texto) return
                      form.setValue("descripcion", texto, { shouldValidate: true, shouldDirty: true })
                      ultimaDescripcionAuto.current = texto
                    }}
                    disabled={isPending || !dimensionesCompletas}
                    title="Re-generar descripción con el template a partir de las 5 dimensiones"
                  >
                    <Wand2 className="mr-1 h-3.5 w-3.5" />
                    Regenerar desde wizard
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

          <FormField
            control={form.control}
            name="categoriaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría *</FormLabel>
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
        </div>

        <Separator />

        {/* ── Responsable + Fecha ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="responsableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsable *</FormLabel>
                <FormControl>
                  <Combobox
                    options={usuarios.map((u) => {
                      const nombreCompleto = [u.nombre, u.apellido].filter(Boolean).join(" ").trim()
                      // En SIPRECOM el userName suele ser el email — evitamos duplicarlo.
                      const identificador = u.userName && u.userName !== u.email ? u.userName : u.email
                      const label = nombreCompleto
                        ? `${nombreCompleto} — ${identificador}`
                        : identificador
                      return { value: u.usuarioId, label }
                    })}
                    value={field.value ?? ""}
                    onChange={(v) => field.onChange(v || "")}
                    placeholder="Asignar a un usuario"
                    searchPlaceholder="Buscar por nombre, apellido, usuario o email..."
                    emptyMessage="Sin usuarios en el proyecto"
                    disabled={isPending || readonlyResponsable}
                  />
                </FormControl>
                {readonlyResponsable && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Para reasignar, usá la acción de workflow en el detalle del pendiente.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fechaCierreEstimado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cierre estimado *</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* ── Localización ── */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Localización
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <FormItem>
              <Label>Sistema *</Label>
              <Select
                value={sistemaId || NONE}
                onValueChange={(v) => {
                  const value = v ?? NONE
                  setSistemaId(value === NONE ? "" : value)
                  // Al cambiar el sistema limpiamos el subsistema — así se fuerza
                  // que el user vuelva a elegir uno dentro del nuevo sistema.
                  form.setValue("subSistemaId", "", { shouldDirty: true, shouldValidate: true })
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí sistema">
                    {sistemaId ? sistemas.find((s) => s.id === sistemaId)?.nombre ?? "Sistema" : "Elegí sistema"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
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
                  <FormLabel>Subsistema *</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(v) => v && field.onChange(v)}
                    disabled={isPending || !sistemaId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={sistemaId ? "Elegí subsistema" : "Elegí sistema primero"}>
                          {field.value
                            ? subSistemas.find((ss) => ss.id === field.value)?.nombre ?? "Subsistema"
                            : (sistemaId ? "Elegí subsistema" : "Elegí sistema primero")}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

          <FormField
            control={form.control}
            name="elementoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Elemento{elementoRequerido ? " *" : ""}
                  {especialidadId && (
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
                    placeholder={elementoRequerido ? "Elegí elemento" : "Sin elemento asignado"}
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

        {/* ── Avanzado (colapsable) ── */}
        <div className="rounded-md border bg-muted/30">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground"
            onClick={() => setAvanzadoAbierto((v) => !v)}
          >
            <span>Opciones avanzadas</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${avanzadoAbierto ? "rotate-180" : ""}`} />
          </button>
          {avanzadoAbierto && (
            <div className="px-3 pb-3">
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
            </div>
          )}
        </div>

        {/* Botones sticky */}
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

// Helper para state local del select de sistema (no afecta el formulario).
function useStateLike(
  initialSubSistemaId: string | null | undefined,
  subsistemas: Array<{ id: string; sistemaId: string }>,
) {
  const inferido = initialSubSistemaId
    ? subsistemas.find((ss) => ss.id === initialSubSistemaId)?.sistemaId ?? ""
    : ""
  const [val, setVal] = useState<string>(inferido)
  useEffect(() => {
    if (!val && initialSubSistemaId) {
      const ss = subsistemas.find((s) => s.id === initialSubSistemaId)
      if (ss?.sistemaId) setVal(ss.sistemaId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsistemas.length, initialSubSistemaId])
  return [val, setVal] as const
}
