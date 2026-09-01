"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Info } from "lucide-react"

import { makePendienteCreateSchema, type PendienteFormValues } from "../schema"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useGetPendienteCategorias } from "../api/use-catalogos"
import { useGetPendienteCatalogoArbol } from "../api/use-catalogo-maestro"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import { PRIORIDAD } from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
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
  const permiteDescripcionManual =
    proyectoRaw?.data?.funcionalidadesEfectivas?.PENDIENTES_DESCRIPCION_MANUAL !== false
  const { data: categoriasRaw } = useGetPendienteCategorias()
  // Árbol del catálogo maestro — única fuente de las opciones de los 5 selects
  // del wizard (cascada estricta) y de la descripción/categoría autopobladas.
  const { data: arbolRaw } = useGetPendienteCatalogoArbol()
  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subSistemasRaw } = useGetSubSistemasSelect()
  const { data: usuariosRaw } = useGetProyectoUsuarios(perfil?.proyectoId ?? null)
  // Solo grupos declarados para uso en Pendientes — mismo criterio que la matriz
  // de autorización, para no ofrecer grupos irrelevantes al asignar.
  const { data: gruposResp } = useGetUsuariosGrupos("pendientes")
  const gruposResponsables = gruposResp?.data ?? []
  // Grupos habilitados para restringir visibilidad (pendientes internos).
  // Muestra todos los grupos con `usoVisibilidadPendientes=true` — el backend
  // valida que el creador sea miembro (salvo Admin+). Si el user no es Admin+
  // ni miembro de ninguno, el select simplemente aparece vacío.
  const { data: gruposVisResp } = useGetUsuariosGrupos("visibilidad-pendientes")
  const gruposVisibilidad = gruposVisResp?.data ?? []

  const categorias = categoriasRaw?.data ?? []
  const arbol = arbolRaw?.data ?? []
  const sistemas = sistemasRaw?.data ?? []
  const subSistemas = subSistemasRaw?.data ?? []
  const usuarios = usuariosRaw ?? []

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
      descripcionManual: defaultValues?.descripcionManual ?? false,
      ubicacion: defaultValues?.ubicacion ?? null,
      responsableId: defaultValues?.responsableId ?? "",
      grupoResponsableId: defaultValues?.grupoResponsableId ?? null,
      grupoVisibilidadId: defaultValues?.grupoVisibilidadId ?? null,
      fechaCierreEstimado: defaultValues?.fechaCierreEstimado ?? fechaDefault,
      prioridad: defaultValues?.prioridad ?? 2,
      // Sistema se infiere del subsistema del defaultValues (edición) o queda vacío
      // al crear. La sincronización sistema→subsistema la maneja el useEffect abajo.
      sistemaId: defaultValues?.sistemaId
        ?? subSistemas.find((ss) => ss.id === defaultValues?.subSistemaId)?.sistemaId
        ?? "",
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
  const descripcionManual = form.watch("descripcionManual") ?? false

  // ── Cascada desde el árbol del catálogo ──────────────────────────────
  // Cada nivel se filtra según el elegido en el anterior. Si el user cambia
  // un select superior, los hijos se limpian (useEffect abajo).
  const nivelNode = arbol.find((n) => n.nivelId === nivelId)
  const especialidadNode = nivelNode?.especialidades.find((e) => e.especialidadId === especialidadId)
  const tipoNode = especialidadNode?.tipos.find((t) => t.tipoId === tipoId)
  const accionNode = tipoNode?.acciones.find((a) => a.accionId === accionId)
  const motivoNode = accionNode?.motivos.find((m) => m.motivoId === motivoId)

  // Opciones disponibles para cada select (siempre desde el nodo padre elegido).
  const nivelOptions = useMemo(
    () => arbol.map((n) => ({ id: n.nivelId, label: n.nivelNombre })),
    [arbol],
  )
  const especialidadOptions = useMemo(
    () => (nivelNode?.especialidades ?? []).map((e) => ({ id: e.especialidadId, label: e.especialidadNombre })),
    [nivelNode],
  )
  const tipoOptions = useMemo(
    () => (especialidadNode?.tipos ?? []).map((t) => ({ id: t.tipoId, label: t.tipoNombre })),
    [especialidadNode],
  )
  const accionOptions = useMemo(
    () => (tipoNode?.acciones ?? []).map((a) => ({ id: a.accionId, label: a.accionNombre })),
    [tipoNode],
  )
  const motivoOptions = useMemo(
    () => (accionNode?.motivos ?? []).map((m) => ({ id: m.motivoId, label: m.motivoNombre })),
    [accionNode],
  )

  // Retrocompat en edición: el pendiente puede haberse cargado antes de que el
  // catálogo tuviera esa combinación. Mostramos aviso y dejamos los selects
  // visibles con los valores actuales — si el user cambia alguno, la cascada
  // los limpia y fuerza a elegir dentro del catálogo.
  const dimensionesCompletas = Boolean(nivelId && especialidadId && tipoId && accionId && motivoId)
  const comboFueraDeCatalogo = dimensionesCompletas && !motivoNode

  // Al cambiar un select superior, limpiamos los hijos que ya no sean válidos.
  useEffect(() => {
    if (especialidadId && !especialidadOptions.some((o) => o.id === especialidadId)) {
      form.setValue("especialidadId", "", { shouldValidate: true, shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelId, especialidadOptions.length])
  useEffect(() => {
    if (tipoId && !tipoOptions.some((o) => o.id === tipoId)) {
      form.setValue("tipoId", "", { shouldValidate: true, shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId, tipoOptions.length])
  useEffect(() => {
    if (accionId && !accionOptions.some((o) => o.id === accionId)) {
      form.setValue("accionId", "", { shouldValidate: true, shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoId, accionOptions.length])
  useEffect(() => {
    if (motivoId && !motivoOptions.some((o) => o.id === motivoId)) {
      form.setValue("motivoId", "", { shouldValidate: true, shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accionId, motivoOptions.length])

  // Al cerrarse las 5 dimensiones sobre una hoja del árbol, autopoblamos
  // categoría y descripción (esta última solo si el user NO está overrideando
  // manualmente — el checkbox lo controla).
  useEffect(() => {
    if (!motivoNode) return
    if (form.getValues("categoriaId") !== motivoNode.categoriaId) {
      form.setValue("categoriaId", motivoNode.categoriaId, { shouldValidate: true, shouldDirty: true })
    }
    if (!descripcionManual && form.getValues("descripcion") !== motivoNode.descripcion) {
      form.setValue("descripcion", motivoNode.descripcion, { shouldValidate: true, shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motivoNode?.motivoId, descripcionManual])

  // Toggle del checkbox "Modificar descripción manualmente":
  //  - Al desactivar → restaura la descripción del catálogo (si hay match).
  //  - Al activar → deja el textarea editable con el valor actual (o vacío).
  const onToggleDescripcionManual = (nuevo: boolean) => {
    form.setValue("descripcionManual", nuevo, { shouldDirty: true })
    if (!nuevo && motivoNode) {
      form.setValue("descripcion", motivoNode.descripcion, { shouldValidate: true, shouldDirty: true })
    }
  }

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
      form.setValue("elementoId", null, { shouldDirty: true, shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId, subSistemaIdActual, elementos])

  // Al elegir un elemento con especialidad definida a nivel de ElementoTipo,
  // auto-populamos el campo especialidad si el user no lo tiene cargado.
  // shouldValidate: true es crítico — sin él, el error "Elemento requerido"
  // queda pegado aunque el user ya haya elegido uno.
  const onElementoChange = (nuevoElementoId: string | null) => {
    form.setValue("elementoId", nuevoElementoId, { shouldDirty: true, shouldValidate: true })
    if (!nuevoElementoId) return
    const el = elementos.find((e) => e.id === nuevoElementoId)
    const espDelElemento = el?.elementoTipoEspecialidadId
    if (espDelElemento && espDelElemento !== especialidadId) {
      form.setValue("especialidadId", espDelElemento, { shouldDirty: true, shouldValidate: true })
    }
  }

  // Sistema y Subsistema viven en el form (para tener validación uniforme).
  // El sistema solo filtra el select de subsistemas — el backend consume subSistemaId.
  const sistemaId = form.watch("sistemaId")
  const subSistemasFiltrados = useMemo(
    () => (sistemaId ? subSistemas.filter((ss) => ss.sistemaId === sistemaId) : subSistemas),
    [subSistemas, sistemaId],
  )
  // Cuando cargan los subsistemas después del defaultValue (edición), inferimos
  // el sistema desde el subsistema si no está seteado — necesario porque el
  // defaultValue del form se resuelve una vez y las queries pueden llegar después.
  useEffect(() => {
    if (sistemaId) return
    const currentSubId = form.getValues("subSistemaId")
    if (!currentSubId) return
    const ss = subSistemas.find((s) => s.id === currentSubId)
    if (ss?.sistemaId) {
      form.setValue("sistemaId", ss.sistemaId, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSistemas.length])
  const elementoOptions = useMemo(
    () => [
      { value: "", label: "Sin elemento asignado" },
      ...elementos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.nombre}` })),
    ],
    [elementos],
  )

  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false)

  // ── Toggle "🔒 Pendiente interno" (compone el estado de grupoVisibilidadId) ──
  //
  // El toggle es azúcar de UI: el modelo persistente sigue siendo un único
  // campo `grupoVisibilidadId` (null = público, con valor = interno). El
  // estado local sincroniza con el form:
  //  - Al montar/editar: toggle = !!grupoVisibilidadId (deriva del form).
  //  - Al activar: si el proyecto tiene default → auto-aplica; sino abre
  //    avanzado + deja el error visible al submit.
  //  - Al desactivar: limpia grupoVisibilidadId (y el override si había).
  const grupoDefaultId = proyectoRaw?.data?.grupoVisibilidadPorDefectoId ?? null
  const grupoDefaultNombre = proyectoRaw?.data?.grupoVisibilidadPorDefectoNombre ?? null
  const [esInterno, setEsInterno] = useState<boolean>(() => !!defaultValues?.grupoVisibilidadId)
  const grupoVisibilidadIdActual = form.watch("grupoVisibilidadId")

  // Al toggle: encender aplica el default (si hay) o abre avanzado; apagar limpia.
  function handleToggleInterno(nuevo: boolean) {
    setEsInterno(nuevo)
    if (nuevo) {
      if (grupoDefaultId) {
        form.setValue("grupoVisibilidadId", grupoDefaultId, { shouldDirty: true })
      } else {
        // Sin default: dejo el campo vacío y abro avanzado para que el user elija.
        setAvanzadoAbierto(true)
      }
    } else {
      form.setValue("grupoVisibilidadId", null, { shouldDirty: true })
    }
  }

  // Indicador "override" — grupo elegido distinto del default del proyecto.
  const esOverride = Boolean(
    esInterno
    && grupoVisibilidadIdActual
    && grupoDefaultId
    && grupoVisibilidadIdActual !== grupoDefaultId,
  )
  const grupoVisibilidadActualNombre = grupoVisibilidadIdActual
    ? gruposVisibilidad.find((g) => g.id === grupoVisibilidadIdActual)?.nombre ?? null
    : null

  // ── Toggle "Asignar al grupo responsable por defecto" — mismo patrón ──
  const grupoRespDefaultId = proyectoRaw?.data?.grupoResponsablePorDefectoId ?? null
  const grupoRespDefaultNombre = proyectoRaw?.data?.grupoResponsablePorDefectoNombre ?? null
  const [asignarGrupoResp, setAsignarGrupoResp] = useState<boolean>(() => !!defaultValues?.grupoResponsableId)
  const grupoResponsableIdActual = form.watch("grupoResponsableId")

  function handleToggleGrupoResp(nuevo: boolean) {
    setAsignarGrupoResp(nuevo)
    if (nuevo) {
      if (grupoRespDefaultId) {
        form.setValue("grupoResponsableId", grupoRespDefaultId, { shouldDirty: true })
      } else {
        setAvanzadoAbierto(true)
      }
    } else {
      form.setValue("grupoResponsableId", null, { shouldDirty: true })
    }
  }

  const esOverrideResp = Boolean(
    asignarGrupoResp
    && grupoResponsableIdActual
    && grupoRespDefaultId
    && grupoResponsableIdActual !== grupoRespDefaultId,
  )
  const grupoResponsableActualNombre = grupoResponsableIdActual
    ? gruposResponsables.find((g) => g.id === grupoResponsableIdActual)?.nombre ?? null
    : null

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          // Guard local: si algún toggle está activo pero no hay grupo elegido
          // (proyecto sin default), pedimos al usuario que elija uno en
          // avanzado. No lo metemos en el schema para no acoplarlo al
          // proyecto activo — es UX guard, no invariante de dominio.
          if (esInterno && !values.grupoVisibilidadId) {
            setAvanzadoAbierto(true)
            form.setError("grupoVisibilidadId", {
              type: "manual",
              message: "Elegí un grupo o desactivá 'Pendiente interno'.",
            })
            return
          }
          if (asignarGrupoResp && !values.grupoResponsableId) {
            setAvanzadoAbierto(true)
            form.setError("grupoResponsableId", {
              type: "manual",
              message: "Elegí un grupo o desactivá 'Asignar al grupo responsable por defecto'.",
            })
            return
          }
          onSubmit(values)
        })}
        className="flex flex-col gap-6 pb-24 sm:pb-4"
      >
        {/* ── Wizard de descripción (cascada estricta desde catálogo) ── */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Wizard de descripción
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Elegí las 5 dimensiones en cascada — solo se muestran las combinaciones cargadas en
              el catálogo maestro. La descripción y la categoría salen del catálogo.
            </p>
          </div>

          {comboFueraDeCatalogo && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Este pendiente tiene una combinación de dimensiones que ya no existe en el catálogo actual.
                Al cambiar cualquiera de los 5 valores se te pedirá elegir dentro del catálogo.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="nivelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={nivelOptions.map((o) => ({ value: o.id, label: o.label }))}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || "")}
                      placeholder="Elegí nivel"
                      searchPlaceholder="Buscar..."
                      emptyMessage="Sin niveles en el catálogo"
                      disabled={isPending || arbol.length === 0}
                    />
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
                  <FormLabel>Especialidad *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={especialidadOptions.map((o) => ({ value: o.id, label: o.label }))}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || "")}
                      placeholder={nivelId ? "Elegí especialidad" : "Elegí nivel primero"}
                      searchPlaceholder="Buscar..."
                      emptyMessage="Sin opciones para este nivel"
                      disabled={isPending || !nivelId}
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
                  <FormControl>
                    <Combobox
                      options={tipoOptions.map((o) => ({ value: o.id, label: o.label }))}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || "")}
                      placeholder={especialidadId ? "Elegí tipo" : "Elegí especialidad primero"}
                      searchPlaceholder="Buscar..."
                      emptyMessage="Sin opciones para esta especialidad"
                      disabled={isPending || !especialidadId}
                    />
                  </FormControl>
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
                  <FormControl>
                    <Combobox
                      options={accionOptions.map((o) => ({ value: o.id, label: o.label }))}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || "")}
                      placeholder={tipoId ? "Elegí acción" : "Elegí tipo primero"}
                      searchPlaceholder="Buscar..."
                      emptyMessage="Sin opciones para este tipo"
                      disabled={isPending || !tipoId}
                    />
                  </FormControl>
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
                  <FormControl>
                    <Combobox
                      options={motivoOptions.map((o) => ({ value: o.id, label: o.label }))}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || "")}
                      placeholder={accionId ? "Elegí motivo" : "Elegí acción primero"}
                      searchPlaceholder="Buscar..."
                      emptyMessage="Sin opciones para esta acción"
                      disabled={isPending || !accionId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* ── Descripción + Categoría (del catálogo) ── */}
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Descripción *</FormLabel>
                  {permiteDescripcionManual && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={descripcionManual}
                        onChange={(e) => onToggleDescripcionManual(e.target.checked)}
                        disabled={isPending}
                        className="h-3.5 w-3.5 accent-blue-900"
                      />
                      Modificar descripción manualmente
                    </label>
                  )}
                </div>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                    readOnly={!descripcionManual}
                    rows={3}
                    className={!descripcionManual ? "bg-muted/40" : ""}
                    placeholder={motivoNode ? undefined : "Elegí las 5 dimensiones — la descripción viene del catálogo."}
                  />
                </FormControl>
                {!descripcionManual && motivoNode && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Texto sugerido por el catálogo. Tildá "Modificar descripción manualmente" para editarlo.
                  </p>
                )}
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
                <FormControl>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-gray-700">
                    {categorias.find((c) => c.id === field.value)?.nombre
                      ?? (motivoNode ? motivoNode.categoriaNombre : <span className="text-muted-foreground">Sale del catálogo al completar el wizard</span>)}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Ubicación geográfica — opcional. Texto libre para ayudar a encontrar
              el equipo o el lugar del pendiente cuando el PID + TAG no alcanzan. */}
          <FormField
            control={form.control}
            name="ubicacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="Ej.: sala de bombas, nivel -3, cerca de la escalera oeste"
                    rows={2}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* ── Responsable + Fecha ── */}
        {/* El grupo responsable (co-responsable, opcional) se maneja con el
            toggle de abajo — el select con override vive en Opciones avanzadas. */}
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

        {/* Toggles de composición — cada toggle compone el estado de un campo
            del pendiente (grupoVisibilidadId, grupoResponsableId). El select
            con override vive dentro de Opciones avanzadas más abajo.
            Reglas comunes a los dos:
              - off  → campo = null (público / sin grupo).
              - on  + proyecto tiene default → auto-aplica el default.
              - on  + proyecto sin default → abre avanzado + hint amber.
              - on  + user eligió otro grupo en avanzado → chip "override".  */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Toggle "Pendiente interno" — grupo de visibilidad. */}
          <div className="rounded-md border bg-white px-3 py-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-900"
                checked={esInterno}
                onChange={(e) => handleToggleInterno(e.target.checked)}
                disabled={isPending}
              />
              <span className="text-sm font-medium">🔒 Pendiente interno</span>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              {!esInterno
                ? "Visible para todos los que acceden al proyecto."
                : grupoVisibilidadIdActual
                  ? (
                      <>
                        Grupo:{" "}
                        <span className="font-medium text-gray-800">
                          {grupoVisibilidadActualNombre ?? "…"}
                        </span>
                        {esOverride && (
                          <span className="ml-2 inline-flex items-center rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium">
                            override
                          </span>
                        )}
                        {!esOverride && grupoDefaultId && (
                          <span className="ml-1 text-[10px] text-muted-foreground">(default del proyecto)</span>
                        )}
                      </>
                    )
                  : (
                      <span className="text-amber-700">
                        ⚠️ Este proyecto no tiene grupo por defecto configurado. Elegí uno en Opciones avanzadas.
                      </span>
                    )}
            </p>
          </div>

          {/* Toggle "Grupo responsable por defecto" — grupo co-responsable.
              No otorga permisos: solo hace que el pendiente aparezca en "Míos"
              a todos los miembros del grupo. Permisos del workflow se
              configuran en la matriz de autorización del proyecto. */}
          <div className="rounded-md border bg-white px-3 py-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-900"
                checked={asignarGrupoResp}
                onChange={(e) => handleToggleGrupoResp(e.target.checked)}
                disabled={isPending || readonlyResponsable}
              />
              <span className="text-sm font-medium">👥 Asignar al grupo responsable por defecto</span>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              {!asignarGrupoResp
                ? 'Solo el responsable nominal verá este pendiente en "Míos".'
                : grupoResponsableIdActual
                  ? (
                      <>
                        Grupo:{" "}
                        <span className="font-medium text-gray-800">
                          {grupoResponsableActualNombre ?? "…"}
                        </span>
                        {esOverrideResp && (
                          <span className="ml-2 inline-flex items-center rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium">
                            override
                          </span>
                        )}
                        {!esOverrideResp && grupoRespDefaultId && (
                          <span className="ml-1 text-[10px] text-muted-foreground">(default del proyecto)</span>
                        )}
                      </>
                    )
                  : (
                      <span className="text-amber-700">
                        ⚠️ Este proyecto no tiene grupo responsable por defecto. Elegí uno en Opciones avanzadas.
                      </span>
                    )}
            </p>
          </div>
        </div>

        <Separator />

        {/* ── Localización ── */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Localización
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <FormField
              control={form.control}
              name="sistemaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sistema *</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(v) => {
                      if (!v) return
                      field.onChange(v)
                      // Al cambiar el sistema limpiamos el subsistema — así se
                      // fuerza al user a elegir uno dentro del nuevo sistema.
                      form.setValue("subSistemaId", "", { shouldDirty: true, shouldValidate: true })
                    }}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí sistema">
                          {field.value
                            ? sistemas.find((s) => s.id === field.value)?.nombre ?? "Sistema"
                            : "Elegí sistema"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sistemas.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
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
            <div className="px-3 pb-3 space-y-4">
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

              {/* Grupo de visibilidad — solo se muestra con el toggle activo.
                  Permite override del default del proyecto por pendiente. */}
              {esInterno && (
                <FormField
                  control={form.control}
                  name="grupoVisibilidadId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Grupo que verá el pendiente
                        {esOverride && (
                          <span className="inline-flex items-center rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium">
                            override
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          options={gruposVisibilidad.map((g) => ({ value: g.id, label: g.nombre }))}
                          value={field.value ?? ""}
                          onChange={(v) => field.onChange(v || null)}
                          placeholder={grupoDefaultId ? `Default: ${grupoDefaultNombre ?? "…"}` : "Elegí un grupo"}
                          searchPlaceholder="Buscar grupo..."
                          emptyMessage="No hay grupos habilitados para visibilidad"
                          disabled={isPending}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        {grupoDefaultId
                          ? esOverride
                            ? `El default del proyecto es "${grupoDefaultNombre ?? "…"}". Estás usando otro.`
                            : "Podés elegir otro grupo si querés distinto al default."
                          : "El proyecto no tiene default configurado — es obligatorio elegir uno."}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Grupo responsable — solo se muestra con el toggle activo.
                  Igual patrón que el de visibilidad: override del default. */}
              {asignarGrupoResp && (
                <FormField
                  control={form.control}
                  name="grupoResponsableId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Grupo responsable
                        {esOverrideResp && (
                          <span className="inline-flex items-center rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium">
                            override
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          options={gruposResponsables.map((g) => ({ value: g.id, label: g.nombre }))}
                          value={field.value ?? ""}
                          onChange={(v) => field.onChange(v || null)}
                          placeholder={grupoRespDefaultId ? `Default: ${grupoRespDefaultNombre ?? "…"}` : "Elegí un grupo"}
                          searchPlaceholder="Buscar grupo..."
                          emptyMessage="No hay grupos habilitados para Pendientes"
                          disabled={isPending || readonlyResponsable}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        {grupoRespDefaultId
                          ? esOverrideResp
                            ? `El default del proyecto es "${grupoRespDefaultNombre ?? "…"}". Estás usando otro.`
                            : 'El pendiente aparece en "Míos" a todo el grupo. No cambia permisos.'
                          : "El proyecto no tiene default configurado — es obligatorio elegir uno."}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
