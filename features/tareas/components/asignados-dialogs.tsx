"use client"

import { useMemo, useState } from "react"
import { Loader2, Users } from "lucide-react"

import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AsignadoDeSeleccion } from "@/features/tareas/api/use-coordinacion-tareas"

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

/** Lista de usuarios con checkbox y buscador. Compartida por los tres diálogos. */
function ListaSeleccionable({
  usuarios,
  elegidos,
  onToggle,
  vacio,
}: {
  usuarios: { id: string; etiqueta: string; detalle?: string }[]
  elegidos: Set<string>
  onToggle: (id: string) => void
  vacio: string
}) {
  const [busqueda, setBusqueda] = useState("")
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((u) =>
      `${u.etiqueta} ${u.detalle ?? ""}`.toLowerCase().includes(q))
  }, [usuarios, busqueda])

  if (usuarios.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">{vacio}</p>

  return (
    <div className="space-y-2">
      {usuarios.length > 8 && (
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar..."
          className="h-8"
        />
      )}
      <div className="max-h-64 overflow-y-auto rounded border divide-y">
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
            Nada coincide con la búsqueda.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * AGREGAR asignados a la selección. No pisa a nadie: los que ya estaban se quedan,
 * así que el diálogo no necesita mostrar el estado actual de cada tarea —que en un
 * lote es distinto en cada una—.
 */
export function AgregarAsignadosDialog({
  onOpenChange, cantidadTareas, usuarios, onConfirmar, cargando, error,
}: {
  onOpenChange: (v: boolean) => void
  cantidadTareas: number
  usuarios: UsuarioElegible[]
  onConfirmar: (usuarioIds: string[]) => void
  cargando?: boolean
  error?: string | null
}) {
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set())

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
            Se suman a los que ya estén asignados. Para sacar a alguien usá Quitar.
          </AlertDialogDescription>
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
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar([...elegidos])}
            disabled={elegidos.size === 0 || cargando}
          >
            {cargando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Asignar {elegidos.size > 0 ? `${elegidos.size} usuario(s)` : ""}
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
  onOpenChange, tareaLabel, usuarios, actuales, onConfirmar, cargando, error,
}: {
  onOpenChange: (v: boolean) => void
  tareaLabel: string
  usuarios: UsuarioElegible[]
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
