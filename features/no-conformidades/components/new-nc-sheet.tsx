"use client"

import { useMemo, useState } from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Combobox } from "@/components/ui/combobox"

import { useCreateNoConformidad } from "../api/use-no-conformidades"
import { useGetNcMotivos, useGetNcTipos } from "../api/use-catalogos"
import { useGetNcAreas } from "../api/use-nc-areas"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama con el id del informe creado, para navegar a su detalle. */
  onCreada?: (id: string) => void
  /** Cuando se escala desde un pendiente, queda vinculado como origen. */
  pendienteOrigenId?: string
  /** Valores heredados del pendiente al escalar. */
  defaults?: {
    titulo?: string
    subSistemaId?: string
    elementoId?: string
    especialidadId?: string
    descripcion?: string
  }
}

/**
 * Campo del formulario. El wrapper con `space-y-1.5` es lo que separa la
 * etiqueta del control — sin eso quedan pegados. Es la misma separación que usa
 * FilterField en la barra de filtros.
 */
function Campo({
  label,
  children,
  className,
  hint,
}: {
  label: string
  children: React.ReactNode
  className?: string
  hint?: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint}
    </div>
  )
}

export function NewNoConformidadSheet({
  open,
  onOpenChange,
  onCreada,
  pendienteOrigenId,
  defaults,
}: Props) {
  const tipos = useGetNcTipos()
  const motivos = useGetNcMotivos()
  const areas = useGetNcAreas(open)
  const subsistemas = useGetSubSistemasSelect()
  const especialidades = useGetEspecialidades()
  const crear = useCreateNoConformidad()

  const [error, setError] = useState<string | null>(null)
  const [tipoId, setTipoId] = useState("")
  const [titulo, setTitulo] = useState(defaults?.titulo ?? "")
  const [severidad, setSeveridad] = useState("1")
  const [grupoAfectadoId, setGrupoAfectadoId] = useState("")
  const [grupoSeguimientoId, setGrupoSeguimientoId] = useState("")
  const [motivoId, setMotivoId] = useState("")
  const [subSistemaId, setSubSistemaId] = useState(defaults?.subSistemaId ?? "")
  const [especialidadId, setEspecialidadId] = useState(defaults?.especialidadId ?? "")
  const [elementoId, setElementoId] = useState(defaults?.elementoId ?? "")
  const [fechaCompromiso, setFechaCompromiso] = useState("")
  const [descripcion, setDescripcion] = useState(defaults?.descripcion ?? "")

  const listaTipos = tipos.data?.data ?? []
  const listaMotivos = motivos.data?.data ?? []
  // Cada select tiene su propia lista: el área afectada ejecuta y la de seguimiento
  // controla, así que los grupos elegibles salen de las acciones que el proyecto
  // autorizó a cada familia. Si el proyecto no configuró la matriz, las dos listas
  // traen todos los grupos marcados para Calidad, como antes.
  const areasAfectada = areas.data?.data?.afectada ?? []
  const areasSeguimiento = areas.data?.data?.seguimiento ?? []

  // El área de seguimiento que propone el proyecto. Se usa como valor del select
  // mientras el usuario no haya elegido otra: así el campo llega completo sin que
  // haga falta un efecto que lo escriba —que además pisaría la elección si el
  // proyecto cambiara su default con el formulario abierto.
  const seguimientoEfectivo =
    grupoSeguimientoId || (areas.data?.data?.seguimientoPorDefectoId ?? '')
  const listaSubsistemas = (subsistemas.data?.data ?? []) as {
    id: string
    codigo: string
    nombre: string
  }[]

  const listaEspecialidades = especialidades.data?.data ?? []

  // ── Localización: subsistema → especialidad → elemento ──────────────────
  //
  // Mismo criterio que el alta de un pendiente: el elemento se filtra por lo que ya
  // se eligió, para no ofrecer una lista de miles. Los tres campos son opcionales —
  // una no conformidad puede ser del subsistema entero— pero cuanto más preciso sea
  // el informe, más fácil es después encontrarlo y cerrarlo.
  const { data: elementosRaw } = useGetElementos({
    page: 1,
    pageSize: 500,
    subSistemaId: subSistemaId || undefined,
    especialidadId: especialidadId || undefined,
  })
  // Memoizado porque alimenta un useMemo: el `?? []` crea un array nuevo en cada
  // render y recalcularía las opciones del combo para nada.
  const elementos = useMemo(() => elementosRaw?.data ?? [], [elementosRaw])

  // El elemento elegido puede quedar fuera de la lista filtrada —típico cuando
  // viene heredado del pendiente que se escala y después se toca la especialidad.
  // Sin la opción, el Combobox mostraría vacío y parecería que se perdió.
  const elementoElegido = useGetElemento(elementoId || null).data?.data ?? null

  const elementoOptions = useMemo(() => {
    const opts = [
      { value: "", label: "Sin elemento" },
      ...elementos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.nombre}` })),
    ]
    if (elementoElegido && !opts.some((o) => o.value === elementoElegido.id))
      opts.push({
        value: elementoElegido.id,
        label: `${elementoElegido.tag} — ${elementoElegido.nombre}`,
      })
    return opts
  }, [elementos, elementoElegido])

  /**
   * Al elegir un elemento, su especialidad —la del tipo— pisa la del formulario: es
   * el dato más concreto que dio el usuario. Va en el handler y no en un efecto,
   * que además de disparar renders en cascada haría imposible dejar la especialidad
   * en blanco a propósito.
   */
  const elegirElemento = (id: string) => {
    setElementoId(id)
    const elegido =
      elementos.find((e) => e.id === id) ??
      (elementoElegido?.id === id ? elementoElegido : null)
    if (!elegido) return
    // El elemento es el dato más concreto que dio el usuario, así que impone los dos
    // de arriba: su subsistema —no hay forma de que la NC sea de otro— y la
    // especialidad de su tipo.
    if (elegido.subSistemaId) setSubSistemaId(elegido.subSistemaId)
    if (elegido.elementoTipoEspecialidadId)
      setEspecialidadId(elegido.elementoTipoEspecialidadId)
  }

  /** Cambiar de subsistema invalida el elemento: pertenece al anterior. */
  const elegirSubSistema = (id: string) => {
    setSubSistemaId(id)
    if (elementoElegido && elementoElegido.subSistemaId !== id) setElementoId("")
  }

  const mismasAreas =
    Boolean(grupoAfectadoId) && grupoAfectadoId === seguimientoEfectivo

  const puedeGuardar =
    Boolean(tipoId) &&
    titulo.trim().length > 0 &&
    Boolean(grupoAfectadoId) &&
    Boolean(seguimientoEfectivo) &&
    !mismasAreas &&
    descripcion.trim().length > 0 &&
    !crear.isPending

  const guardar = () => {
    setError(null)
    crear.mutate(
      {
        tipoId,
        titulo: titulo.trim(),
        severidad: Number(severidad),
        grupoAfectadoId,
        grupoSeguimientoId: seguimientoEfectivo,
        motivoId: motivoId || undefined,
        subSistemaId: subSistemaId || undefined,
        elementoId: elementoId || undefined,
        especialidadId: especialidadId || undefined,
        fechaCompromiso: fechaCompromiso || undefined,
        descripcion: descripcion.trim(),
        pendienteOrigenId: pendienteOrigenId || undefined,
      },
      {
        onSuccess: (res) => {
          const id = (res as { data?: { id?: string } })?.data?.id
          if (id && onCreada) onCreada(id)
          else onOpenChange(false)
        },
        onError: (e: unknown) => {
          setError(
            (e as { body?: { message?: string } })?.body?.message ??
              (e as Error)?.message ??
              "No se pudo crear el informe.",
          )
        },
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl!">
        <SheetHeader>
          <SheetTitle>Nuevo informe de calidad</SheetTitle>
          <SheetDescription>
            Nace en Evaluación: el área de seguimiento tiene que aceptarlo antes de que
            el área afectada empiece a trabajar.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4">
          {error && (
            <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
          )}

          {/* Dos columnas: la clasificación a la izquierda, el contexto a la
              derecha. Título y descripción cruzan ambas porque son texto largo. */}
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Campo label="Título *" className="sm:col-span-2">
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={300}
                placeholder="Resumen en una línea"
              />
            </Campo>

            <Campo label="Tipo *">
              <Select value={tipoId} onValueChange={(v) => setTipoId(v ?? "")}>
                <SelectTrigger className="w-full">
                  {/* Sin children, SelectValue muestra el value crudo — o sea el
                      GUID. Hay que resolver la etiqueta a mano. */}
                  <SelectValue>
                    {(() => {
                      const t = listaTipos.find((x) => x.id === tipoId)
                      return t ? `${t.codigo} — ${t.nombre}` : "Seleccioná el tipo"
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listaTipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.codigo} — {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Severidad">
              <Select value={severidad} onValueChange={(v) => setSeveridad(v ?? "1")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{severidad === "2" ? "Mayor" : "Menor"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Menor</SelectItem>
                  <SelectItem value="2">Mayor</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              label="Área afectada *"
              hint={
                !areas.isLoading && areasAfectada.length === 0 ? (
                  <p className="text-xs text-destructive">
                    Ningún grupo está habilitado para ejecutar la resolución en este
                    proyecto. Revisá la matriz de Calidad en la configuración del
                    proyecto.
                  </p>
                ) : null
              }
            >
              <Select
                value={grupoAfectadoId}
                onValueChange={(v) => setGrupoAfectadoId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {areasAfectada.find((g) => g.id === grupoAfectadoId)?.nombre ??
                      "Quién tiene que resolver"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areasAfectada.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              label="Área de seguimiento *"
              hint={
                mismasAreas ? (
                  <p className="text-xs text-destructive">
                    Debe ser distinta de la afectada: una ejecuta y la otra controla.
                  </p>
                ) : !areas.isLoading && areasSeguimiento.length === 0 ? (
                  <p className="text-xs text-destructive">
                    Ningún grupo está habilitado para controlar el circuito en este
                    proyecto. Revisá la matriz de Calidad en la configuración del
                    proyecto.
                  </p>
                ) : null
              }
            >
              <Select
                value={seguimientoEfectivo}
                onValueChange={(v) => setGrupoSeguimientoId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {areasSeguimiento.find((g) => g.id === seguimientoEfectivo)?.nombre ??
                      "Quién controla y valida"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areasSeguimiento.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Motivo">
              <Select value={motivoId} onValueChange={(v) => setMotivoId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {listaMotivos.find((m) => m.id === motivoId)?.nombre ?? "Opcional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listaMotivos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Fecha de compromiso">
              <Input
                type="date"
                value={fechaCompromiso}
                onChange={(e) => setFechaCompromiso(e.target.value)}
              />
            </Campo>

            <Campo
              label="Subsistema"
              className="sm:col-span-2"
              hint={
                !subSistemaId ? (
                  <p className="text-xs text-amber-700">
                    Sin subsistema, el informe no bloquea la emisión de certificados.
                  </p>
                ) : null
              }
            >
              <Select
                value={subSistemaId}
                onValueChange={(v) => elegirSubSistema(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(() => {
                      const s = listaSubsistemas.find((x) => x.id === subSistemaId)
                      return s ? `${s.codigo} — ${s.nombre}` : "Opcional"
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listaSubsistemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.codigo} — {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Especialidad">
              <Select
                value={especialidadId}
                onValueChange={(v) => setEspecialidadId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {listaEspecialidades.find((e) => e.id === especialidadId)?.nombre ??
                      "Opcional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listaEspecialidades.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              label="Elemento"
              hint={
                subSistemaId || especialidadId ? null : (
                  <p className="text-xs text-muted-foreground">
                    Elegí subsistema o especialidad para acotar la lista.
                  </p>
                )
              }
            >
              <Combobox
                options={elementoOptions}
                value={elementoId}
                onChange={(v) => elegirElemento(v || "")}
                placeholder="Opcional"
                searchPlaceholder="Buscar por TAG o nombre..."
                emptyMessage="Sin elementos"
              />
            </Campo>

            <Campo label="Descripción del hallazgo *" className="sm:col-span-2">
              <Textarea
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Qué se detectó y en qué contexto."
              />
            </Campo>
          </div>

          <div className="flex gap-2 pt-5">
            <Button disabled={!puedeGuardar} onClick={guardar}>
              {crear.isPending ? "Creando…" : "Crear informe"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
