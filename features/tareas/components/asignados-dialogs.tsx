"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Users } from "lucide-react"

import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AsignadoDeSeleccion } from "@/features/tareas/api/use-coordinacion-tareas"
import type { GrupoAsignacionOpcion } from "@/features/usuarios-grupos/types"

export interface UsuarioElegible {
  usuarioId: string
  nombre?: string | null
  apellido?: string | null
  email: string
}

export function nombreUsuario(u: UsuarioElegible): string {
  const nom = [u.nombre, u.apellido].filter(Boolean).join(" ").trim()
  return nom || u.email
}

/**
 * "Juan Pérez +2" para la columna. Un solo nombre cuando hay uno, y el resto como
 * contador: con cuatro asignados la celda no puede crecer, pero el total tiene que
 * verse — si mostrara sólo el primero, una tarea con cuatro personas parecería tener
 * una.
 *
 * El `title` lleva la lista completa, que es lo que resuelve "¿y los otros dos?" sin
 * abrir nada.
 */
export function AsignadosResumen({
  asignados,
}: {
  asignados?: { usuarioId: string; nombre: string | null }[]
}) {
  if (!asignados || asignados.length === 0)
    return <span className="text-muted-foreground">Sin asignar</span>

  const nombres = asignados.map((a) => a.nombre ?? "—")
  return (
    <span title={nombres.join("\n")} className="inline-flex items-center gap-1">
      <span className="truncate">{nombres[0]}</span>
      {nombres.length > 1 && (
        <span className="shrink-0 rounded bg-gray-100 px-1 text-xs font-medium text-gray-600">
          +{nombres.length - 1}
        </span>
      )}
    </span>
  )
}

const CLASE_SELECT =
  "h-8 w-full min-w-0 rounded-md border border-input bg-white px-2 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500"

/**
 * La selección de checkboxes de los diálogos. Vive en un hook porque los tres la
 * manejan igual, y porque tildar de una todo lo que se ve necesita mover varios ids
 * en un solo cambio.
 */
function useSeleccion(inicial?: string[]) {
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set(inicial))

  return {
    elegidos,
    toggle: (id: string) =>
      setElegidos((prev) => {
        const s = new Set(prev)
        if (s.has(id)) s.delete(id); else s.add(id)
        return s
      }),
    toggleVarios: (ids: string[], marcar: boolean) =>
      setElegidos((prev) => {
        const s = new Set(prev)
        for (const id of ids) { if (marcar) s.add(id); else s.delete(id) }
        return s
      }),
    limpiar: () => setElegidos(new Set()),
  }
}

/**
 * Lista de usuarios con checkbox, buscador y filtro por grupo. Compartida por los
 * diálogos de asignar.
 *
 * El buscador está siempre, aunque haya tres usuarios. Antes aparecía recién pasando
 * los ocho, y el efecto era peor que el ahorro: en un proyecto chico nadie sabía que
 * existía, así que al primero grande lo buscaban a ojo por una lista de cincuenta.
 *
 * El filtro por grupo es una ayuda para BUSCAR y nada más: lo que se tilda acá se
 * asigna igual que si se hubiera encontrado scrolleando, sin dejar ningún vínculo con
 * el grupo. Que la membresía del grupo cambie después no mueve nada.
 */
function ListaSeleccionable({
  usuarios,
  elegidos,
  onToggle,
  onToggleVarios,
  vacio,
  grupos,
}: {
  usuarios: { id: string; etiqueta: string; detalle?: string }[]
  elegidos: Set<string>
  onToggle: (id: string) => void
  /** Sin esto no se ofrece tildar en bloque — el diálogo de Quitar no lo quiere. */
  onToggleVarios?: (ids: string[], marcar: boolean) => void
  vacio: string
  grupos?: GrupoAsignacionOpcion[]
}) {
  const [busqueda, setBusqueda] = useState("")
  const [grupoId, setGrupoId] = useState("")

  const grupo = grupos?.find((g) => g.id === grupoId)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const delGrupo = grupo ? new Set(grupo.usuarioIds) : null
    return usuarios.filter(
      (u) =>
        (!delGrupo || delGrupo.has(u.id))
        && (!q || `${u.etiqueta} ${u.detalle ?? ""}`.toLowerCase().includes(q)),
    )
  }, [usuarios, busqueda, grupo])

  const hayFiltro = !!grupo || busqueda.trim() !== ""
  const todosFiltradosTildados =
    filtrados.length > 0 && filtrados.every((u) => elegidos.has(u.id))

  if (usuarios.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">{vacio}</p>

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o mail..."
          className="h-8"
        />
        {grupos && grupos.length > 0 && (
          <select
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            className={`${CLASE_SELECT} sm:w-48`}
          >
            <option value="">Todos los grupos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tildar de una todo lo filtrado. Es para esto que sirve el filtro por grupo:
          asignarle algo a todo Montaje son dos clics y no diez.

          Alcanza a TODO lo que el filtro deja pasar, no a lo que entra en el alto de
          la caja: la lista no está paginada —el endpoint devuelve los usuarios del
          proyecto completos y el filtro corre acá— así que lo de abajo del scroll
          también se tilda. Por eso la etiqueta no dice "los que se ven", que era una
          promesa más chica que lo que hace.

          Y dice el número, no "todos": sin filtro son todos los usuarios del
          proyecto, que en uno grande es justo el clic que conviene ver antes de dar. */}
      {onToggleVarios && filtrados.length > 1 && (
        <button
          type="button"
          onClick={() => onToggleVarios(filtrados.map((u) => u.id), !todosFiltradosTildados)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          {todosFiltradosTildados ? "Destildar los " : "Agregar los "}
          {filtrados.length}{hayFiltro ? " filtrados" : " usuarios"}
        </button>
      )}

      <div className="max-h-64 divide-y overflow-y-auto rounded border">
        {filtrados.map((u) => (
          <label
            key={u.id}
            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
          >
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0"
              checked={elegidos.has(u.id)}
              onChange={() => onToggle(u.id)}
            />
            <span className="min-w-0 flex-1 truncate">{u.etiqueta}</span>
            {u.detalle && (
              <span className="shrink-0 text-xs text-muted-foreground">{u.detalle}</span>
            )}
          </label>
        ))}
        {filtrados.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {grupo && !busqueda.trim()
              ? `Ningún usuario de este proyecto está en ${grupo.nombre}.`
              : "Nada coincide con la búsqueda."}
          </p>
        )}
      </div>

      {/* El contador va afuera de la lista porque el filtro puede estar escondiendo a
          alguien tildado: sin esto, filtrar por un grupo después de haber tildado a
          tres dejaba el botón diciendo un número que no se correspondía con nada
          visible. */}
      {elegidos.size > 0 && (
        <p className="text-xs text-muted-foreground">
          {elegidos.size} tildado(s), contando los que el filtro no muestra.
        </p>
      )}
    </div>
  )
}

/** Lo que el diálogo de asignar manda al confirmar. */
export interface AsignacionBulk {
  usuarioIds: string[]
  /** Deja las tareas con exactamente los indicados, en vez de sumarlos. */
  reemplazar: boolean
}

/**
 * ASIGNAR en lote. Se tildan usuarios de la lista, que se filtra por texto y por
 * grupo, y "Agregar los N que se ven" evita tildarlos de a uno.
 *
 * El grupo es nada más que una forma de encontrar gente: lo que se tilda queda como
 * cualquier otra asignación y no sigue a la membresía. Hubo una versión que podía
 * asignar el grupo COMO TAL —filas que recordaban de dónde salieron, para poder
 * ponerlas al día después— y se sacó a propósito: el efecto inmediato era idéntico,
 * la diferencia aparecía semanas más tarde y sólo si un Admin apretaba re-sincronizar,
 * y dos opciones que hacen lo mismo salvo en eso se eligen a ojo. Está en el commit
 * 2c807df si alguna vez hace falta.
 *
 * Por defecto SUMA: los que ya estaban se quedan. El tilde de reemplazar los pisa, y
 * por eso lista a quién va a sacar antes de confirmar — en un lote cada tarea tiene
 * asignados distintos, así que sin esa lista el usuario estaría pisando a ciegas. Es
 * el mismo dato que alimenta el diálogo de Quitar, y se pide recién al tildar.
 */
export function AgregarAsignadosDialog({
  onOpenChange, cantidadTareas, usuarios, grupos, union, cargandoUnion, onPedirUnion,
  onConfirmar, cargando, error,
}: {
  onOpenChange: (v: boolean) => void
  cantidadTareas: number
  usuarios: UsuarioElegible[]
  grupos?: GrupoAsignacionOpcion[]
  union: AsignadoDeSeleccion[]
  cargandoUnion?: boolean
  onPedirUnion: () => void
  onConfirmar: (args: AsignacionBulk) => void
  cargando?: boolean
  error?: string | null
}) {
  const { elegidos, toggle, toggleVarios } = useSeleccion()
  const [reemplazar, setReemplazar] = useState(false)

  // A quién se va a sacar si reemplaza. Se pide la unión al tildar y no al abrir: en el
  // caso normal —sumar— el dato no se usa, y sería una request por cada vez que alguien
  // abre el diálogo.
  useEffect(() => {
    if (reemplazar) onPedirUnion()
    // onPedirUnion es estable del lado del caller; depender de él re-pediría la unión
    // en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reemplazar])

  const aSacar = reemplazar ? union.filter((a) => !elegidos.has(a.usuarioId)) : []

  const items = usuarios.map((u) => ({
    id: u.usuarioId,
    etiqueta: nombreUsuario(u),
    detalle: u.email,
  }))

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Asignar a {cantidadTareas} tarea(s)</AlertDialogTitle>
          <AlertDialogDescription>
            {reemplazar
              ? "Las tareas quedan con exactamente los indicados acá."
              : "Se suman a los que ya estén asignados. Para sacar a alguien usá Quitar."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ListaSeleccionable
          usuarios={items}
          elegidos={elegidos}
          onToggle={toggle}
          onToggleVarios={toggleVarios}
          vacio="No hay usuarios en este proyecto."
          grupos={grupos}
        />

        <label className="flex cursor-pointer items-start gap-2 rounded border border-dashed p-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0"
            checked={reemplazar}
            onChange={(e) => setReemplazar(e.target.checked)}
          />
          <span className="min-w-0">
            <span className="font-medium">Reemplazar los asignados actuales</span>
            <span className="block text-xs text-muted-foreground">
              Sin tildar, se suman a los que ya estén.
            </span>

            {reemplazar && (
              cargandoUnion ? (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Viendo a quién afecta...
                </span>
              ) : aSacar.length === 0 ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  No saca a nadie: en la selección no hay otros asignados.
                </span>
              ) : (
                <span className="mt-1 block text-xs text-amber-700">
                  Se va a sacar a{" "}
                  {aSacar
                    .map((a) => `${a.nombre ?? a.email ?? a.usuarioId} (${a.tareas})`)
                    .join(", ")}
                  . El número es de cuántas tareas de la selección lo pierden.
                </span>
              )
            )}
          </span>
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar({ usuarioIds: [...elegidos], reemplazar })}
            disabled={elegidos.size === 0 || cargando}
          >
            {cargando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Asignar{elegidos.size > 0 ? ` ${elegidos.size} usuario(s)` : ""}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * QUITAR asignados de la selección.
 *
 * Ofrece la UNIÓN de los asignados del lote con en cuántas tareas está cada uno, que
 * es la única forma honesta de hacerlo: las tareas seleccionadas tienen asignaciones
 * distintas, y una lista de "todos los usuarios del proyecto" dejaría elegir a gente
 * que no está trabajando en nada de esto. El conteo además contesta, de paso, quién
 * está en esta selección.
 */
export function QuitarAsignadosDialog({
  onOpenChange, cantidadTareas, union, cargandoUnion, onConfirmar, cargando, error,
}: {
  onOpenChange: (v: boolean) => void
  cantidadTareas: number
  union: AsignadoDeSeleccion[]
  cargandoUnion?: boolean
  onConfirmar: (args: { usuarioIds: string[]; todos: boolean }) => void
  cargando?: boolean
  error?: string | null
}) {
  const { elegidos, toggle, limpiar } = useSeleccion()
  const [todos, setTodos] = useState(false)

  const items = union.map((a) => ({
    id: a.usuarioId,
    etiqueta: a.nombre ?? a.email ?? a.usuarioId,
    detalle: `${a.tareas} tarea${a.tareas === 1 ? "" : "s"}`,
  }))

  const puedeConfirmar = todos || elegidos.size > 0

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quitar de {cantidadTareas} tarea(s)</AlertDialogTitle>
          <AlertDialogDescription>
            Se saca de las tareas de la selección que lo tengan. Las que no, no se tocan.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {cargandoUnion ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando quién está asignado...
          </div>
        ) : union.length === 0 ? (
          <div className="space-y-2 py-6 text-center">
            <Users className="mx-auto h-8 w-8 text-gray-400" />
            <p className="text-sm text-muted-foreground">
              Ninguna de las tareas seleccionadas tiene asignados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Sin tildar-en-bloque a propósito: acá ya está el tilde de "todos",
                que es lo mismo pero explícito y además alcanza a los que el
                listado no trajo. */}
            <ListaSeleccionable
              usuarios={items}
              elegidos={elegidos}
              onToggle={toggle}
              vacio="Ninguna de las tareas seleccionadas tiene asignados."
            />

            <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed p-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={todos}
                onChange={(e) => {
                  setTodos(e.target.checked)
                  if (e.target.checked) limpiar()
                }}
              />
              <span>
                <span className="font-medium">Quitar a todos</span>
                <span className="block text-xs text-muted-foreground">
                  Deja las {cantidadTareas} tarea(s) sin nadie asignado.
                </span>
              </span>
            </label>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirmar({ usuarioIds: [...elegidos], todos })}
            disabled={!puedeConfirmar || cargando}
          >
            {cargando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {todos ? "Quitar a todos" : `Quitar ${elegidos.size > 0 ? elegidos.size : ""}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Editar los asignados de UNA tarea. Acá sí es reemplazo —se guarda exactamente lo
 * tildado— y está bien que lo sea: sobre una fila el usuario ve quiénes están y a
 * quién destilda, que es justamente lo que no se puede ver en un lote.
 */
export function EditarAsignadosDialog({
  onOpenChange, tareaLabel, usuarios, grupos, actuales, onConfirmar, cargando, error,
}: {
  onOpenChange: (v: boolean) => void
  tareaLabel: string
  usuarios: UsuarioElegible[]
  grupos?: GrupoAsignacionOpcion[]
  actuales: string[]
  onConfirmar: (usuarioIds: string[]) => void
  cargando?: boolean
  error?: string | null
}) {
  const { elegidos, toggle, toggleVarios } = useSeleccion(actuales)

  const items = usuarios.map((u) => ({
    id: u.usuarioId,
    etiqueta: nombreUsuario(u),
    detalle: u.email,
  }))

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Asignados</AlertDialogTitle>
          <AlertDialogDescription>{tareaLabel}</AlertDialogDescription>
        </AlertDialogHeader>

        <ListaSeleccionable
          usuarios={items}
          elegidos={elegidos}
          onToggle={toggle}
          onToggleVarios={toggleVarios}
          vacio="No hay usuarios en este proyecto."
          grupos={grupos}
        />

        <p className="text-xs text-muted-foreground">
          {elegidos.size === 0
            ? "Sin nadie tildado, la tarea queda sin asignar."
            : `${elegidos.size} asignado(s).`}
        </p>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cargando}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirmar([...elegidos])} disabled={cargando}>
            {cargando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
