"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2, Users, X } from "lucide-react"

import {
  useAgregarMiembrosEquipo,
  useCreateEquipo,
  useDeleteEquipo,
  useGetEquipo,
  useGetEquipos,
  useQuitarMiembroEquipo,
  useUpdateEquipo,
} from "@/features/equipos/api/use-equipos"
import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"
import type { Equipo } from "@/features/equipos/types"
import {
  FUNCIONALIDAD,
  useFuncionalidadPlataforma,
} from "@/features/funcionalidades/api/use-funcionalidades-plataforma"
import { FuncionalidadDesactivada } from "@/features/funcionalidades/components/funcionalidad-desactivada"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

/**
 * Equipos de administración: quién administra qué parte del catálogo de planillas.
 *
 * Es de AdminGlobal y no por formalidad: el acceso a un equipo es lo único que acota el
 * modelo. Si un Admin pudiera crear equipos y agregarse, se auto-otorgaría la propiedad de
 * las planillas. Ver Siprecom.Server.Api/Docs/PLAN-EQUIPOS-ADMINISTRACION-PLANILLAS.md.
 */
export default function EquiposPage() {
  const hayEquipos = useFuncionalidadPlataforma(FUNCIONALIDAD.equiposAdministracion)

  // El ABM va en un componente aparte para poder cortar antes de sus hooks: así no se
  // piden equipos, usuarios ni nada cuando la funcionalidad está apagada.
  if (!hayEquipos) {
    return (
      <FuncionalidadDesactivada
        titulo="Los equipos de administración están desactivados"
        descripcion="Con la funcionalidad apagada hay un solo catálogo de planillas y cualquier Admin lo administra, así que no hay equipos que repartir. Los equipos que estaban cargados no se borraron: vuelven a aplicar al reactivarla."
      />
    )
  }

  return <EquiposAdmin />
}

function EquiposAdmin() {
  const { data, isLoading } = useGetEquipos()
  const create = useCreateEquipo()
  const update = useUpdateEquipo()
  const remove = useDeleteEquipo()

  const items = data?.data ?? []

  const [editSheet, setEditSheet] = useState<{
    mode: "new" | "edit"
    id?: string
    nombre: string
    descripcion: string
  } | null>(null)
  const [miembrosSheetId, setMiembrosSheetId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!editSheet || !editSheet.nombre.trim()) return
    setError(null)
    try {
      const payload = {
        nombre: editSheet.nombre.trim(),
        descripcion: editSheet.descripcion.trim() || undefined,
      }
      if (editSheet.mode === "new") await create.mutateAsync(payload)
      else await update.mutateAsync({ id: editSheet.id!, ...payload })
      setEditSheet(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function eliminar() {
    if (!confirmDelete) return
    setError(null)
    try {
      await remove.mutateAsync(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e) {
      // El backend bloquea si el equipo tiene planillas o proyectos, y el mensaje dice
      // cuántos: se muestra tal cual en el diálogo.
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Equipos de administración</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Un equipo es dueño de un pedazo del catálogo de planillas: sus miembros las
            administran sin necesitar AdminGlobal. Las planillas sin equipo son{" "}
            <span className="font-medium">globales</span> — las ve y las usa todo el mundo, y
            las administrás vos.
          </p>
        </div>
        <Button
          onClick={() => { setError(null); setEditSheet({ mode: "new", nombre: "", descripcion: "" }) }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo equipo
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700">Equipo</TableHead>
              <TableHead className="w-28 text-center font-semibold text-gray-700">Miembros</TableHead>
              <TableHead className="w-28 text-center font-semibold text-gray-700">Planillas</TableHead>
              <TableHead className="w-28 text-center font-semibold text-gray-700">Proyectos</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Todavía no hay equipos. Mientras no haya ninguno, todas las planillas son
                  globales y las administrás vos.
                </TableCell>
              </TableRow>
            ) : (
              items.map((e: Equipo) => (
                <TableRow key={e.id} className="hover:bg-gray-50">
                  <TableCell>
                    <p className="font-medium">{e.nombre}</p>
                    {e.descripcion && (
                      <p className="text-xs text-muted-foreground">{e.descripcion}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 tabular-nums"
                      onClick={() => setMiembrosSheetId(e.id)}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {e.cantidadMiembros}
                    </Button>
                  </TableCell>
                  {/* Los dos contadores contestan por qué no se puede borrar un equipo. */}
                  <TableCell className="text-center tabular-nums">{e.cantidadPlanillas}</TableCell>
                  <TableCell className="text-center tabular-nums">{e.cantidadProyectos}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setError(null); setEditSheet({
                          mode: "edit", id: e.id, nombre: e.nombre, descripcion: e.descripcion ?? "",
                        }) }}
                        aria-label={`Editar ${e.nombre}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => { setError(null); setConfirmDelete({ id: e.id, nombre: e.nombre }) }}
                        aria-label={`Eliminar ${e.nombre}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Alta / edición ── */}
      <Sheet open={editSheet !== null} onOpenChange={(v) => !v && setEditSheet(null)}>
        <SheetContent className="w-full sm:max-w-md!">
          <SheetHeader>
            <SheetTitle>{editSheet?.mode === "new" ? "Nuevo equipo" : "Editar equipo"}</SheetTitle>
            <SheetDescription>
              El nombre es el que van a ver los Admin en el selector de su perfil y en la
              columna de planillas.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={editSheet?.nombre ?? ""}
                onChange={(ev) => setEditSheet((s) => s && { ...s, nombre: ev.target.value })}
                placeholder="Ej. Eléctrico, Mecánico, Pluspetrol"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={editSheet?.descripcion ?? ""}
                onChange={(ev) => setEditSheet((s) => s && { ...s, descripcion: ev.target.value })}
                placeholder="Opcional"
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                disabled={!editSheet?.nombre.trim() || create.isPending || update.isPending}
                onClick={guardar}
              >
                Guardar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditSheet(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MiembrosSheet equipoId={miembrosSheetId} onClose={() => setMiembrosSheetId(null)} />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{confirmDelete?.nombre}</span> deja de existir y sus
              miembros pierden el acceso. Si tiene planillas o proyectos asignados, hay que
              reasignarlos primero.
            </AlertDialogDescription>
            {/* El error va afuera de la descripción: el backend devuelve el detalle de por qué
                no se puede borrar (cuántas planillas, cuántos proyectos) y se muestra en el
                diálogo, que es donde el usuario está mirando. */}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => { ev.preventDefault(); eliminar() }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Miembros ────────────────────────────────────────────────────────────────

/**
 * Quién tiene acceso al equipo, con el transfer de siempre: disponibles a la izquierda,
 * asignados a la derecha.
 *
 * Solo se ofrecen usuarios con rol Admin: AdminGlobal no necesita acceso —bypasea— y a un
 * User el equipo no le habilita nada, así que ofrecerlos sería ruido.
 */
function MiembrosSheet({ equipoId, onClose }: { equipoId: string | null; onClose: () => void }) {
  const { data, isLoading } = useGetEquipo(equipoId)
  const agregar = useAgregarMiembrosEquipo(equipoId)
  const quitar = useQuitarMiembroEquipo(equipoId)

  const [busqueda, setBusqueda] = useState("")
  const [filtroMiembros, setFiltroMiembros] = useState("")
  const [error, setError] = useState<string | null>(null)

  const equipo = data?.data
  // Memoizado: se usa como dependencia de dos useMemo, y recrearlo en cada render los
  // invalidaría siempre.
  const miembros = useMemo(() => equipo?.miembros ?? [], [equipo])

  const { data: usuariosData } = useGetUsuarios({
    pageSize: 50,
    isLocked: false,
    rol: "Admin",
    nombre: busqueda || undefined,
  })

  const yaEstan = useMemo(() => new Set(miembros.map((m) => m.usuarioId)), [miembros])
  const candidatos = (usuariosData?.data ?? []).filter((u) => !yaEstan.has(u.id))

  const miembrosFiltrados = useMemo(() => {
    const q = filtroMiembros.trim().toLowerCase()
    if (!q) return miembros
    return miembros.filter((m) =>
      [m.apellido, m.nombre, m.email].filter(Boolean).join(" ").toLowerCase().includes(q),
    )
  }, [miembros, filtroMiembros])

  async function agregarUsuario(usuarioId: string) {
    setError(null)
    try { await agregar.mutateAsync([usuarioId]) } catch (e) { setError((e as Error).message) }
  }

  async function quitarUsuario(usuarioId: string) {
    setError(null)
    try { await quitar.mutateAsync(usuarioId) } catch (e) { setError((e as Error).message) }
  }

  return (
    <Sheet open={equipoId !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-4xl!">
        <SheetHeader>
          <SheetTitle>Acceso al equipo — {equipo?.nombre ?? ""}</SheetTitle>
          <SheetDescription>
            Los Admin con acceso administran las planillas de este equipo. Sumá desde la
            izquierda, quitá desde la derecha.
          </SheetDescription>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 gap-4 px-4 pb-4 md:grid-cols-2">
          <section className="flex min-h-0 flex-col rounded-lg border">
            <header className="border-b bg-gray-50 px-3 py-2">
              <h3 className="text-sm font-semibold">Disponibles</h3>
              <p className="text-xs text-muted-foreground">
                Usuarios con rol Admin que no están en el equipo.
              </p>
            </header>

            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o email…"
                  className="pl-8"
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {candidatos.length === 0 ? (
                <li className="p-2 text-sm italic text-muted-foreground">
                  {busqueda ? "Sin coincidencias." : "No hay Admin disponibles."}
                </li>
              ) : (
                candidatos.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {[u.apellido, u.nombre].filter(Boolean).join(", ") || u.email}
                      </p>
                      {u.email && <p className="truncate text-xs text-muted-foreground">{u.email}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 gap-1"
                      disabled={agregar.isPending}
                      onClick={() => agregarUsuario(u.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="flex min-h-0 flex-col rounded-lg border">
            <header className="border-b bg-gray-50 px-3 py-2">
              <h3 className="text-sm font-semibold">
                Con acceso{" "}
                <span className="font-normal tabular-nums text-muted-foreground">
                  ({miembros.length})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Quitar el acceso no da de baja a nadie: deja de administrar este catálogo.
              </p>
            </header>

            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filtroMiembros}
                  onChange={(e) => setFiltroMiembros(e.target.value)}
                  placeholder="Filtrar miembros…"
                  className="pl-8"
                  disabled={miembros.length === 0}
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {isLoading ? (
                <li className="p-2 text-sm text-muted-foreground">Cargando…</li>
              ) : miembros.length === 0 ? (
                <li className="p-2 text-sm italic text-muted-foreground">
                  Sin miembros: nadie administra las planillas de este equipo todavía.
                </li>
              ) : miembrosFiltrados.length === 0 ? (
                <li className="p-2 text-sm italic text-muted-foreground">Sin coincidencias.</li>
              ) : (
                miembrosFiltrados.map((m) => (
                  <li
                    key={m.usuarioId}
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {[m.apellido, m.nombre].filter(Boolean).join(", ") || m.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      {/* Estar en dos equipos es la excepción y significa que administra dos
                          catálogos: si no se dijera, una doble asignación por error no se
                          notaría hasta que alguien edite lo que no esperaba. */}
                      {m.otrosEquipos.length > 0 && (
                        <p className="mt-0.5 text-xs text-amber-700">
                          También administra: {m.otrosEquipos.join(", ")}
                        </p>
                      )}
                    </div>
                    {m.esActivo && (
                      <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        Su equipo activo
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={quitar.isPending}
                      onClick={() => quitarUsuario(m.usuarioId)}
                      aria-label="Quitar acceso"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        {error && (
          <p className="mx-4 mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </SheetContent>
    </Sheet>
  )
}
