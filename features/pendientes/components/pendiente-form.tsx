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
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import { useGetMisAmbitos } from "@/features/pendientes-ambitos/api/use-pendientes-ambitos"
import { PRIORIDAD } from "../types"
import {
  CAMPO_DIMENSION,
  DIMENSIONES,
  LABEL_DIMENSION,
  SELECCION_VACIA,
  aplanarArbol,
  filaCoincide,
  reconciliarSeleccion,
  seleccionAlcanzable,
  type Dimension,
  type FilaCatalogo,
  type OpcionDimension,
  type SeleccionDimensiones,
} from "../catalogo-facetas"

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
  // Catálogo maestro — única fuente de las opciones de los 5 selects del wizard
  // y de la descripción/categoría autopobladas. Ver `catalogo-facetas.ts`.
  const { data: arbolRaw } = useGetPendienteCatalogoArbol()
  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subSistemasRaw } = useGetSubSistemasSelect()
  const { data: usuariosRaw } = useGetProyectoUsuarios(perfil?.proyectoId ?? null)
  // Solo grupos declarados para uso en Pendientes — mismo criterio que la matriz
  // de autorización, para no ofrecer grupos irrelevantes al asignar.
  const { data: gruposResp } = useGetUsuariosGrupos("pendientes")
  const gruposResponsables = gruposResp?.data ?? []

  const categorias = categoriasRaw?.data ?? []
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
      ambitoId: defaultValues?.ambitoId ?? null,
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

  // ── Filtrado cruzado entre las 5 dimensiones ─────────────────────────
  // El catálogo maestro es una tabla PLANA de 5-tuplas: el "árbol" que devuelve
  // el backend es sólo un agrupamiento de presentación, no una jerarquía real.
  // Por eso no imponemos un orden: aplanamos de vuelta y cada select ofrece los
  // valores que siguen siendo alcanzables dadas LAS OTRAS dimensiones elegidas.
  //
  // Esto vale por dos motivos concretos:
  //  - El usuario puede empezar por donde quiera (típicamente por Especialidad,
  //    cuando ésta viene del Elemento).
  //  - Como las opciones de cada dimensión se calculan excluyéndose a sí misma,
  //    elegir cualquier opción ofrecida deja SIEMPRE una tupla que existe en el
  //    catálogo. Es decir: no hace falta limpiar hijos al cambiar un select.
  const filas = useMemo<FilaCatalogo[]>(() => aplanarArbol(arbolRaw?.data ?? []), [arbolRaw])

  const seleccion = useMemo<SeleccionDimensiones>(
    () => ({ nivel: nivelId, especialidad: especialidadId, tipo: tipoId, accion: accionId, motivo: motivoId }),
    [nivelId, especialidadId, tipoId, accionId, motivoId],
  )

  // Un pendiente viejo puede tener una combinación que el catálogo ya no
  // contiene. Si filtráramos por ella, los 5 selects quedarían vacíos y sin
  // salida: en ese caso ofrecemos todo el catálogo para poder re-anclar.
  const seleccionValida = useMemo(
    () => seleccionAlcanzable(filas, seleccion),
    [filas, seleccion],
  )

  const opciones = useMemo(() => {
    const base = seleccionValida ? seleccion : SELECCION_VACIA
    const out = {} as Record<Dimension, OpcionDimension[]>
    for (const dim of DIMENSIONES) {
      const vistos = new Set<string>()
      const acc: OpcionDimension[] = []
      // Filtramos por todas las dimensiones MENOS la propia: así el select
      // siempre muestra alternativas para su eje sin auto-restringirse.
      for (const fila of filas) {
        if (!filaCoincide(fila, base, dim)) continue
        const id = fila[`${dim}Id`]
        if (vistos.has(id)) continue
        vistos.add(id)
        acc.push({ id, label: fila[`${dim}Nombre`], orden: dim === "nivel" ? fila.nivelPosicion : 0 })
      }
      acc.sort((a, b) => a.orden - b.orden || a.label.localeCompare(b.label))
      out[dim] = acc
    }
    return out
  }, [filas, seleccion, seleccionValida])

  // Fila exacta del catálogo cuando las 5 dimensiones cierran. De acá salen la
  // categoría y la descripción autopobladas.
  const filaSeleccionada = useMemo(
    () => (DIMENSIONES.every((d) => seleccion[d])
      ? filas.find((f) => DIMENSIONES.every((d) => f[`${d}Id`] === seleccion[d])) ?? null
      : null),
    [filas, seleccion],
  )

  // Retrocompat en edición: el pendiente puede haberse cargado antes de que el
  // catálogo tuviera esa combinación. Mostramos aviso y dejamos los selects
  // visibles con los valores actuales — nunca los pisamos solos, para no perder
  // datos históricos. Si el user cambia alguno, el filtrado cruzado lo reencauza.
  const dimensionesCompletas = DIMENSIONES.every((d) => Boolean(seleccion[d]))
  const comboFueraDeCatalogo = dimensionesCompletas && !filaSeleccionada && filas.length > 0

  // Al cerrarse las 5 dimensiones sobre una fila del catálogo, autopoblamos
  // categoría y descripción (esta última solo si el user NO está overrideando
  // manualmente — el checkbox lo controla).
  useEffect(() => {
    if (!filaSeleccionada) return
    if (form.getValues("categoriaId") !== filaSeleccionada.categoriaId) {
      form.setValue("categoriaId", filaSeleccionada.categoriaId, { shouldValidate: true, shouldDirty: true })
    }
    if (!descripcionManual && form.getValues("descripcion") !== filaSeleccionada.descripcion) {
      form.setValue("descripcion", filaSeleccionada.descripcion, { shouldValidate: true, shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filaSeleccionada?.motivoId, filaSeleccionada?.categoriaId, descripcionManual])

  /** Limpia las 5 dimensiones para volver a elegir dentro del catálogo. */
  const reiniciarWizard = () => {
    for (const d of DIMENSIONES) {
      form.setValue(CAMPO_DIMENSION[d], "", { shouldDirty: true, shouldValidate: true })
    }
  }

  // Toggle del checkbox "Modificar descripción manualmente":
  //  - Al desactivar → restaura la descripción del catálogo (si hay match).
  //  - Al activar → deja el textarea editable con el valor actual (o vacío).
  const onToggleDescripcionManual = (nuevo: boolean) => {
    form.setValue("descripcionManual", nuevo, { shouldDirty: true })
    if (!nuevo && filaSeleccionada) {
      form.setValue("descripcion", filaSeleccionada.descripcion, { shouldValidate: true, shouldDirty: true })
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

  // El elemento elegido puede quedar fuera de la lista filtrada (típico al venir
  // pre-cargado desde la maqueta 3D y después tocar la especialidad del wizard).
  // NO lo limpiamos: era el dato de partida del usuario. Lo resolvemos aparte
  // para poder seguir mostrándolo y avisamos que no matchea el filtro.
  const elementoElegidoQuery = useGetElemento(elementoIdActual ?? null)
  const elementoElegido = elementoElegidoQuery.data?.data ?? null
  const elementoFueraDelFiltro = Boolean(
    elementoIdActual && elementos.length > 0 && !elementos.some((e) => e.id === elementoIdActual),
  )

  // Al elegir un elemento con especialidad definida a nivel de ElementoTipo,
  // la imponemos sobre el wizard: el elemento es el dato más concreto que dio
  // el usuario. Es la ÚNICA escritura externa sobre las 5 dimensiones, así que
  // es el único lugar donde la selección puede quedar inconsistente y hay que
  // reconciliarla (elegir dentro de las opciones ofrecidas nunca la rompe).
  // shouldValidate: true es crítico — sin él, el error "Elemento requerido"
  // queda pegado aunque el user ya haya elegido uno.
  const [ajusteWizard, setAjusteWizard] = useState<Dimension[]>([])
  const [especialidadSinCatalogo, setEspecialidadSinCatalogo] = useState(false)

  // La especialidad puede llegar PRE-CARGADA (prefill desde la maqueta 3D) apuntando
  // a una que el catálogo maestro no cubre — hoy solo Cañerías y CIVIL tienen filas.
  // Ahí el select no puede ofrecerla y el valor quedaría seteado pero invisible.
  // La soltamos y avisamos, en vez de dejar un valor fantasma filtrando elementos.
  useEffect(() => {
    if (filas.length === 0 || !especialidadId) return
    if (filas.some((f) => f.especialidadId === especialidadId)) return
    form.setValue("especialidadId", "", { shouldDirty: false, shouldValidate: false })
    setEspecialidadSinCatalogo(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas.length, especialidadId])

  const onElementoChange = (nuevoElementoId: string | null) => {
    form.setValue("elementoId", nuevoElementoId, { shouldDirty: true, shouldValidate: true })
    setAjusteWizard([])
    setEspecialidadSinCatalogo(false)
    if (!nuevoElementoId) return
    const el = elementos.find((e) => e.id === nuevoElementoId)
    const espDelElemento = el?.elementoTipoEspecialidadId
    if (!espDelElemento || espDelElemento === especialidadId) return

    // Si el catálogo no tiene ninguna fila para esa especialidad, aplicarla
    // dejaría los 5 selects sin opciones. Preferimos no tocar el wizard y avisar.
    if (filas.length > 0 && !filas.some((f) => f.especialidadId === espDelElemento)) {
      setEspecialidadSinCatalogo(true)
      return
    }

    const { seleccion: saneada, soltadas } = reconciliarSeleccion(
      filas,
      { ...seleccion, especialidad: espDelElemento },
      ["especialidad"],
    )
    for (const d of DIMENSIONES) {
      if (saneada[d] !== seleccion[d]) {
        form.setValue(CAMPO_DIMENSION[d], saneada[d], { shouldDirty: true, shouldValidate: true })
      }
    }
    setAjusteWizard(soltadas)
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
  const elementoOptions = useMemo(() => {
    const opts = [
      { value: "", label: "Sin elemento asignado" },
      ...elementos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.nombre}` })),
    ]
    // El elegido va sí o sí, aunque el filtro por especialidad lo deje afuera:
    // sin la opción, el Combobox mostraría vacío y parecería que se perdió.
    if (elementoElegido && !opts.some((o) => o.value === elementoElegido.id)) {
      opts.push({ value: elementoElegido.id, label: `${elementoElegido.tag} — ${elementoElegido.nombre}` })
    }
    return opts
  }, [elementos, elementoElegido])

  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false)

  // Ámbito — la primera decisión del formulario: define quién va a ver el
  // pendiente. El selector ofrece solo los ámbitos donde este usuario puede
  // clasificar (endpoint /mios), así que nadie manda un pendiente a un lugar
  // donde después no lo va a ver.
  //
  // Con dos ámbitos se dibuja como un checkbox —igual que el viejo "interno"—
  // y el selector aparece recién cuando hay tres o más. La generalidad del
  // modelo no se le cobra al usuario hasta que la necesita.
  const { data: ambitosResp } = useGetMisAmbitos()
  const misAmbitos = ambitosResp?.data ?? []
  const ambitoIdActual = form.watch("ambitoId")
  const ambitoPrincipal = misAmbitos.find((a) => a.esPrincipal) ?? null
  const ambitoRestringido = misAmbitos.find((a) => !a.esPrincipal) ?? null
  const ambitoActual = misAmbitos.find((a) => a.id === ambitoIdActual) ?? null
  const modoCheckbox = misAmbitos.length === 2 && !!ambitoPrincipal && !!ambitoRestringido

  // Sin elección explícita, el pendiente nace en el principal.
  useEffect(() => {
    if (!ambitoIdActual && ambitoPrincipal) {
      form.setValue("ambitoId", ambitoPrincipal.id)
    }
  }, [ambitoIdActual, ambitoPrincipal, form])

  // Toggle "Asignar al grupo responsable por defecto" — mismo patrón simple.
  // Compone el estado de grupoResponsableId: on con default del proyecto lo
  // aplica; on sin default abre avanzado para elegir; off limpia el grupo.
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
          // Guard local: si "Asignar al grupo responsable" está
          // activo pero no hay grupo elegido (proyecto sin default), pedimos
          // al usuario que elija uno en avanzado.
          if (asignarGrupoResp && !values.grupoResponsableId) {
            setAvanzadoAbierto(true)
            form.setError("grupoResponsableId", {
              type: "manual",
              message: "Elegí un grupo o desactivá 'Asignar al grupo responsable'.",
            })
            return
          }
          onSubmit(values)
        })}
        className="flex flex-col gap-6 pb-24 sm:pb-4"
      >
        {/* ── Wizard de descripción (filtrado cruzado desde el catálogo) ── */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Wizard de descripción
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Elegí las 5 dimensiones en el orden que quieras — cada una filtra a las demás y
              solo se ofrecen las combinaciones cargadas en el catálogo maestro. La descripción
              y la categoría salen del catálogo.
            </p>
          </div>

          {comboFueraDeCatalogo && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Este pendiente tiene una combinación de dimensiones que ya no existe en el catálogo actual.
                Podés dejarla como está o reiniciar el wizard para elegir dentro del catálogo.
              </span>
              <button
                type="button"
                className="ml-auto shrink-0 underline underline-offset-2 font-medium cursor-pointer"
                onClick={reiniciarWizard}
              >
                Reiniciar
              </button>
            </div>
          )}

          {especialidadSinCatalogo && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                La especialidad del elemento no tiene combinaciones cargadas en el catálogo maestro
                de pendientes, así que el wizard no puede ofrecerla. Elegí las 5 dimensiones a mano —
                el elemento queda seleccionado igual.
              </span>
            </div>
          )}

          {ajusteWizard.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Ajustamos la especialidad según el elemento elegido. Volvé a elegir:{" "}
                {ajusteWizard.map((d) => LABEL_DIMENSION[d]).join(", ")}.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DIMENSIONES.map((dim) => {
              // Distinguimos "el catálogo no tiene nada" de "no queda nada compatible
              // con lo ya elegido" — el segundo caso se resuelve destildando otro select.
              const hayOtrasElegidas = DIMENSIONES.some((d) => d !== dim && seleccion[d])
              return (
                <FormField
                  key={dim}
                  control={form.control}
                  name={CAMPO_DIMENSION[dim]}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{LABEL_DIMENSION[dim]} *</FormLabel>
                      <FormControl>
                        <Combobox
                          options={opciones[dim].map((o) => ({ value: o.id, label: o.label }))}
                          value={field.value ?? ""}
                          onChange={(v) => field.onChange(v || "")}
                          placeholder={`Elegí ${LABEL_DIMENSION[dim].toLowerCase()}`}
                          searchPlaceholder="Buscar..."
                          emptyMessage={
                            hayOtrasElegidas
                              ? "Sin opciones para la combinación elegida"
                              : "Sin datos en el catálogo"
                          }
                          disabled={isPending || filas.length === 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )
            })}
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
                    placeholder={filaSeleccionada ? undefined : "Elegí las 5 dimensiones — la descripción viene del catálogo."}
                  />
                </FormControl>
                {!descripcionManual && filaSeleccionada && (
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
                      ?? (filaSeleccionada ? filaSeleccionada.categoriaNombre : <span className="text-muted-foreground">Sale del catálogo al completar el wizard</span>)}
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
        {/* Cada columna agrupa el dato con el toggle que lo modula: el
            responsable con "asignar al grupo responsable" (que extiende el
            "Míos" a todo el grupo), la fecha con "pendiente interno". El
            select de grupo con override vive en Opciones avanzadas. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div className="flex flex-col gap-3">
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
  
            {/* Toggle "Grupo responsable por defecto" — compone
                grupoResponsableId. No otorga permisos, solo hace que el
                pendiente aparezca en "Míos" a todos los miembros del grupo.
                Va pegado al responsable porque extiende esa misma asignación. */}
            <div className="rounded-md border bg-white px-3 py-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-900"
                  checked={asignarGrupoResp}
                  onChange={(e) => handleToggleGrupoResp(e.target.checked)}
                  disabled={isPending || readonlyResponsable}
                />
                <span className="text-sm font-medium">👥 Asignar al grupo responsable</span>
              </label>
              {/* El texto describe siempre el efecto de tildarlo (estado OFF) o
                  el efecto ya aplicado (estado ON) — nunca la limitación actual,
                  que se leía como si el grupo no fuera a ver el pendiente. */}
              <p className="mt-1 text-xs text-muted-foreground">
                {!asignarGrupoResp
                  ? 'Marcá para asignar este pendiente a todo el grupo responsable, además del responsable.'
                  : grupoResponsableIdActual
                    ? (
                        <>
                          Lo verán en &quot;Míos&quot; todos los miembros de{" "}
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

          <div className="flex flex-col gap-3">
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

            {/* Ámbito — define quién ve el pendiente. El selector ofrece solo los
                ámbitos donde este usuario puede clasificar, así que no se puede
                mandar un pendiente a un lugar donde después no lo vería.

                Con exactamente dos ámbitos se dibuja como el checkbox de siempre;
                el selector aparece recién con tres o más. La generalidad del modelo
                no se le cobra al usuario hasta que la necesita. */}
            <FormField
              control={form.control}
              name="ambitoId"
              render={({ field }) => (
                <FormItem className="rounded-md border bg-white px-3 py-3 space-y-1 m-0">
                  {modoCheckbox && ambitoPrincipal && ambitoRestringido ? (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-blue-900"
                          checked={field.value === ambitoRestringido.id}
                          onChange={(e) =>
                            field.onChange(e.target.checked ? ambitoRestringido.id : ambitoPrincipal.id)
                          }
                          disabled={isPending}
                        />
                        <span className="text-sm font-medium">🔒 {ambitoRestringido.nombre}</span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {field.value === ambitoRestringido.id
                          ? ambitoRestringido.descripcion
                          : "Marcá para restringir quién lo ve. " + (ambitoRestringido.descripcion ?? "")}
                      </p>
                    </>
                  ) : (
                    <>
                      <FormLabel>Ámbito</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        disabled={isPending || misAmbitos.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue>{ambitoActual?.nombre ?? "Elegí un ámbito"}</SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {misAmbitos.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {ambitoActual?.descripcion ?? "Define quién puede ver este pendiente."}
                      </p>
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    onValueChange={(v) => {
                      if (!v) return
                      // Usamos form.setValue con shouldValidate en vez de
                      // field.onChange — el field.onChange de RHF no dispara
                      // revalidación en modo submit-only con Zod resolver, y
                      // el error del schema queda pegado aunque el value ya
                      // sea válido. Mismo patrón que el select de Sistema.
                      form.setValue("subSistemaId", v, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
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
                {elementoFueraDelFiltro && (
                  <p className="text-[11px] text-amber-700">
                    Este elemento es de otra especialidad que la elegida en el wizard. Se mantiene
                    seleccionado; cambiá la especialidad si querés ver los elementos que sí matchean.
                  </p>
                )}
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

              {/* (Select de grupo de visibilidad eliminado 2026-09 — EsInterno
                  es un simple boolean, no requiere elegir grupo.) */}

              {/* Grupo responsable — solo se muestra con el toggle activo.
                  Permite override del default del proyecto por pendiente. */}
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
