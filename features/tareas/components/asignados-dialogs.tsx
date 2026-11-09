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
 * Lista de usuarios con checkbox, buscador y filtro por grupo. Compartida por los
 * diálogos de asignar.
 *
 * El buscador está siempre, aunque haya tres usuarios. Antes aparecía recién pasando
 * los ocho, y el efecto era peor que el ahorro: en un proyecto chico nadie sabía que
 * existía, así que al primero grande lo buscaban a ojo por una lista de cincuenta.
 *
 * El filtro por grupo es una ayuda para BUSCAR y nada más: lo que se tilda acá se
 * asigna igual que si se hubiera encontrado scrolleando, sin dejar vínculo con el
 * grupo. Asignar el grupo como tal es la otra pestaña del diálogo, y hace otra cosa.
 */
function ListaSeleccionable({
  usuarios,
  elegidos,
  onToggle,
  vacio,
  grupos,
}: {
  usuarios: { id: string; etiqueta: string; detalle?: string }[]
  elegidos: Set<string>
  onToggle: (id: string) => void
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
  /** Grupo a expandir; sus miembros quedan con el grupo como origen. */
  grupoId: string | null
  /** Deja las tareas con exactamente los indicados, en vez de sumarlos. */
  reemplazar: boolean
}

/**
 * ASIGNAR en lote, de dos formas que no son la misma cosa:
 *
 *  • **Usuarios**: se tildan de la lista. Entran como asignación manual.
 *  • **Un grupo**: se expande a sus miembros, y cada fila queda diciendo de qué grupo
 *    salió. Eso es lo que después deja poner al día las tareas abiertas cuando alguien
 *    entra o sale del grupo; una asignación manual no se entera nunca.
 *
 * Son dos pestañas y no un tilde porque la diferencia no está en la comodidad de
 * elegir sino en lo que queda grabado, y eso no se adivina.
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
  const [modo, setModo] = useState<"usuarios" | "grupo">("usuarios")
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set())
  const [grupoId, setGrupoId] = useState("")
  const [reemplazar, setReemplazar] = useState(false)

  const hayGrupos = !!grupos && grupos.length > 0
  const grupo = grupos?.find((g) => g.id === grupoId)

  // A quién se va a sacar si reemplaza. Se pide la unión al tildar y no al abrir: en el
  // caso normal —sumar— el dato no se usa, y sería una request por cada vez que alguien
  // abre el diálogo.
  useEffect(() => {
    if (reemplazar) onPedirUnion()
    // onPedirUnion es estable del lado del caller; depender de él re-pediría la unión
    // en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reemplazar])

  const aAsignar = modo === "grupo" ? (grupo?.usuarioIds ?? []) : [...elegidos]
  const aSacar = reemplazar ? union.filter((a) => !aAsignar.includes(a.usuarioId)) : []

  const items = usuarios.map((u) => ({
    id: u.usuarioId,
    etiqueta: nombreUsuario(u),
    detalle: u.email,
  }))

  const puedeConfirmar = modo === "grupo"
    ? !!grupo && grupo.cantidadMiembros > 0
    : elegidos.size > 0

  const etiquetaBoton = modo === "grupo"
    ? (grupo ? `Asignar ${grupo.nombre}` : "Asignar grupo")
    : `Asignar${elegidos.size > 0 ? ` ${elegidos.size} usuario(s)` : ""}`

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

        {hayGrupos && (
          <div className="flex gap-1 rounded-md bg-gray-100 p-1">
            {([["usuarios", "Elegir usuarios"], ["grupo", "Un grupo completo"]] as const).map(
              ([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setModo(valor)}
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium ${
                    modo === valor
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {texto}
                </button>
              ),
            )}
          </div>
        )}

        {modo === "usuarios" ? (
          <ListaSeleccionable
            usuarios={items}
            elegidos={elegidos}
            onToggle={(id) =>
              setElegidos((prev) => {
                const s = new Set(prev)
                if (s.has(id)) s.delete(id); else s.add(id)
                return s
              })
            }
            vacio="No hay usuarios en este proyecto."
            grupos={grupos}
          />
        ) : (
          <div className="space-y-2">
            <select
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className={CLASE_SELECT}
            >
              <option value="">Elegir grupo...</option>
              {grupos?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre} — {g.cantidadMiembros} miembro(s)
                </option>
              ))}
            </select>

            {grupo && (
              <div className="space-y-1.5 rounded border p-2.5 text-xs">
                {grupo.cantidadMiembros === 0 ? (
                  <p className="text-destructive">
                    El grupo no tiene miembros: no hay a quién asignar.
                  </p>
                ) : (
                  <p>
                    Se asigna a sus <strong>{grupo.cantidadMiembros}</strong> miembro(s).
                  </p>
                )}

                {/* El conteo por proyecto es el aviso que importa: un grupo cuyos
                    miembros no ven el proyecto recibe las tareas y no se entera nadie. */}
                {grupo.cantidadMiembros > grupo.miembrosEnProyecto && (
                  <p className="text-amber-700">
                    {grupo.cantidadMiembros - grupo.miembrosEnProyecto} de ellos no tiene
                    acceso a este proyecto: la tarea no le va a aparecer hasta que se lo
                    agregue al proyecto.
                  </p>
                )}

                <p className="text-muted-foreground">
                  Queda registrado que la asignación salió del grupo. Si después cambia
                  quién está en el grupo, las tareas abiertas se ponen al día desde
                  Configuración → Grupos de usuarios.
                </p>
              </div>
            )}
          </div>
        )}

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
            onClick={() =>
              onConfirmar({
                usuarioIds: modo === "grupo" ? [] : [...elegidos],
                grupoId: modo === "grupo" ? grupoId : null,
                reemplazar,
              })
            }
            disabled={!puedeConfirmar || cargando}
          >
            {cargando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {etiquetaBoton}
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
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set())
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
            <ListaSeleccionable
              usuarios={items}
              elegidos={elegidos}
              onToggle={(id) =>
                setElegidos((prev) => {
                  const s = new Set(prev)
                  if (s.has(id)) s.delete(id); else s.add(id)
                  return s
                })
              }
              vacio="Ninguna de las tareas seleccionadas tiene asignados."
            />

            <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed p-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={todos}
                onChange={(e) => {
                  setTodos(e.target.checked)
                  if (e.target.checked) setElegidos(new Set())
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
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set(actuales))

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
          onToggle={(id) =>
            setElegidos((prev) => {
              const s = new Set(prev)
              if (s.has(id)) s.delete(id); else s.add(id)
              return s
            })
          }
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
