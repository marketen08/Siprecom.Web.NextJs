"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2, Users, X, Search } from "lucide-react"

import {
  useCreateUsuarioGrupo,
  useDeleteUsuarioGrupo,
  useGetUsuarioGrupo,
  useGetUsuariosGrupos,
  useUpdateUsuarioGrupo,
  useAgregarMiembros,
  useQuitarMiembro,
} from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"

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

interface EditSheetState {
  mode: "new" | "edit"
  id?: string
  nombre: string
  descripcion: string
  usoPendientes: boolean
  usoAccesoProyecto: boolean
  usoVisibilidadPendientes: boolean
}

export default function GruposUsuariosPage() {
  const { data, isLoading } = useGetUsuariosGrupos()
  const create = useCreateUsuarioGrupo()
  const update = useUpdateUsuarioGrupo()
  const remove = useDeleteUsuarioGrupo()

  const items = data?.data ?? []
  const [editSheet, setEditSheet] = useState<EditSheetState | null>(null)
  const [miembrosSheetId, setMiembrosSheetId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!editSheet || !editSheet.nombre.trim()) return
    // Guard local — al menos un uso declarado. El backend también valida,
    // pero acá lo cortamos antes para no gastar el request.
    if (!editSheet.usoPendientes && !editSheet.usoAccesoProyecto && !editSheet.usoVisibilidadPendientes) {
      setError("Seleccioná al menos un caso de uso.")
      return
    }
    setError(null)
    try {
      const payload = {
        nombre: editSheet.nombre.trim(),
        descripcion: editSheet.descripcion.trim() || undefined,
        usoPendientes: editSheet.usoPendientes,
        usoAccesoProyecto: editSheet.usoAccesoProyecto,
        usoVisibilidadPendientes: editSheet.usoVisibilidadPendientes,
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
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Grupos de usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Grupos planos globales. Se usan para autorizar acciones por membresía —
            ej. qué usuarios pueden procesar pendientes en cada estado.
          </p>
        </div>
        <Button
          onClick={() => { setError(null); setEditSheet({
            mode: "new", nombre: "", descripcion: "",
            usoPendientes: true, usoAccesoProyecto: true,
            // Visibilidad restringida es opt-in explícito: solo activar
            // cuando el grupo se creó justamente para ese uso.
            usoVisibilidadPendientes: false,
          }) }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo grupo
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Nombre</TableHead>
              <TableHead className="font-semibold text-gray-700">Descripción</TableHead>
              <TableHead className="w-56 font-semibold text-gray-700">Se usa en</TableHead>
              <TableHead className="w-24 font-semibold text-gray-700 text-right">Miembros</TableHead>
              <TableHead className="w-40 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No hay grupos cargados.
                </TableCell>
              </TableRow>
            ) : (
              items.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.nombre}</TableCell>
                  <TableCell className="text-sm text-gray-600">{g.descripcion || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {g.usoPendientes && (
                        <span className="inline-flex items-center rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[11px] font-medium">
                          Pendientes
                        </span>
                      )}
                      {g.usoAccesoProyecto && (
                        <span className="inline-flex items-center rounded bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 text-[11px] font-medium">
                          Acceso a proyecto
                        </span>
                      )}
                      {g.usoVisibilidadPendientes && (
                        <span className="inline-flex items-center rounded bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 text-[11px] font-medium">
                          Visibilidad pendientes
                        </span>
                      )}
                      {/* Grupos activos nuevos siempre tienen al menos un uso
                          (regla de validación). Los que no aparecen acá son
                          legacy de antes de la regla — quedan silenciados y se
                          arreglan al primer edit. */}
                      {!g.usoPendientes && !g.usoAccesoProyecto && !g.usoVisibilidadPendientes && (
                        <span
                          className="inline-flex items-center rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[11px] font-medium"
                          title="Grupo legacy sin uso declarado. Editalo y marcá al menos uno."
                        >
                          Sin uso
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{g.cantidadMiembros}</span>
                      {/* Badge "en uso" — total de referencias vivas (pendientes,
                          proyectos como default, matriz de autorización). Sirve
                          para anticipar que el delete puede fallar. */}
                      {g.referenciasEnUso > 0 && (
                        <span
                          className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium"
                          title={`Referenciado en ${g.referenciasEnUso} lugar(es). El delete se bloquea mientras existan referencias.`}
                        >
                          {g.referenciasEnUso} en uso
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Gestionar miembros"
                      onClick={() => { setError(null); setMiembrosSheetId(g.id) }}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Editar nombre/descripción"
                      onClick={() => { setError(null); setEditSheet({
                        mode: "edit",
                        id: g.id,
                        nombre: g.nombre,
                        descripcion: g.descripcion ?? "",
                        usoPendientes: g.usoPendientes,
                        usoAccesoProyecto: g.usoAccesoProyecto,
                        usoVisibilidadPendientes: g.usoVisibilidadPendientes,
                      }) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600"
                      title="Eliminar grupo"
                      onClick={() => { setError(null); setConfirmDelete({ id: g.id, nombre: g.nombre }) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">{items.length} grupos</p>

      {/* Sheet crear/editar (nombre + descripción) */}
      <Sheet open={editSheet !== null} onOpenChange={(v) => !v && setEditSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editSheet?.mode === "new" ? "Nuevo grupo" : "Editar grupo"}</SheetTitle>
            <SheetDescription>
              Los miembros se gestionan desde el botón <Users className="inline h-3.5 w-3.5 align-text-bottom" /> en la fila.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={editSheet?.nombre ?? ""}
                onChange={(e) => setEditSheet(editSheet ? { ...editSheet, nombre: e.target.value } : editSheet)}
                placeholder="Ej: Supervisores Mecánica"
                className="mt-1"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={editSheet?.descripcion ?? ""}
                onChange={(e) => setEditSheet(editSheet ? { ...editSheet, descripcion: e.target.value } : editSheet)}
                placeholder="Opcional"
                className="mt-1"
                maxLength={500}
              />
            </div>

            {/* Uso declarado: filtra dónde aparece el grupo como opción. No es
                restricción de seguridad — el service igual chequea membresía.  */}
            <div>
              <label className="text-sm font-medium">Se usa en</label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Determina en qué contextos aparece el grupo como opción. Podés cambiarlo cuando quieras.
              </p>
              <div className="mt-2 space-y-1.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                    checked={editSheet?.usoPendientes ?? true}
                    onChange={(e) => setEditSheet(editSheet ? { ...editSheet, usoPendientes: e.target.checked } : editSheet)}
                  />
                  Pendientes <span className="text-xs text-muted-foreground">(matriz de autorización por proyecto)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                    checked={editSheet?.usoAccesoProyecto ?? true}
                    onChange={(e) => setEditSheet(editSheet ? { ...editSheet, usoAccesoProyecto: e.target.checked } : editSheet)}
                  />
                  Acceso a proyecto <span className="text-xs text-muted-foreground">(bulk-add desde grupo)</span>
                </label>
                {/* Visibilidad restringida — opt-in explícito. Activar solo si
                    el grupo se creó justamente para acotar quién ve ciertos
                    pendientes internos. El backend valida que el creador del
                    pendiente sea miembro (salvo Admin+). */}
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                    checked={editSheet?.usoVisibilidadPendientes ?? false}
                    onChange={(e) => setEditSheet(editSheet ? { ...editSheet, usoVisibilidadPendientes: e.target.checked } : editSheet)}
                  />
                  Visibilidad de pendientes <span className="text-xs text-muted-foreground">(pendientes internos)</span>
                </label>
              </div>
              {editSheet
                && !editSheet.usoPendientes
                && !editSheet.usoAccesoProyecto
                && !editSheet.usoVisibilidadPendientes && (
                <p className="mt-2 text-[11px] text-amber-700">
                  Marcá al menos uno — sino el grupo no aparecerá en ningún selector.
                </p>
              )}
            </div>

            {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={guardar}
                disabled={
                  !editSheet?.nombre.trim()
                  || create.isPending
                  || update.isPending
                  || (!editSheet.usoPendientes && !editSheet.usoAccesoProyecto && !editSheet.usoVisibilidadPendientes)
                }
                className="flex-1"
              >
                {create.isPending || update.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" onClick={() => setEditSheet(null)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet gestión de miembros */}
      <MiembrosSheet
        grupoId={miembrosSheetId}
        onClose={() => setMiembrosSheetId(null)}
      />

      {/* Confirmación de delete */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => { if (!v) { setConfirmDelete(null); setError(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grupo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el grupo <strong>{confirmDelete?.nombre}</strong>? Se dan de baja las
              membresías activas del grupo (soft-delete). Los usuarios en sí no se tocan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 whitespace-pre-line">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => { e.preventDefault(); eliminar() }}
            >
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Sheet gestión de miembros ──────────────────────────────────────────

function MiembrosSheet({ grupoId, onClose }: { grupoId: string | null; onClose: () => void }) {
  const { data: detalle, isLoading } = useGetUsuarioGrupo(grupoId)
  const [busqueda, setBusqueda] = useState("")
  // Solo activos: agregar a un grupo un usuario dado de baja no tiene efecto
  // (la autorización lo excluye por IsLocked igual). Filtramos en origen para
  // no mostrarlos como "candidatos".
  const { data: usuariosData } = useGetUsuarios({
    pageSize: 50,
    nombre: busqueda || undefined,
    isLocked: false,
  })

  const agregar = useAgregarMiembros()
  const quitar = useQuitarMiembro()

  const grupo = detalle?.data
  const miembros = grupo?.miembros ?? []
  const miembroIds = useMemo(() => new Set(miembros.map((m) => m.usuarioId)), [miembros])

  const candidatos = (usuariosData?.data ?? []).filter((u) => !miembroIds.has(u.id))

  async function agregarUsuario(usuarioId: string) {
    if (!grupoId) return
    try {
      await agregar.mutateAsync({ grupoId, usuarioIds: [usuarioId] })
    } catch {
      // El error del backend se muestra en un toast global (ver ConfirmActionDialog pattern); acá silencio.
    }
  }

  async function quitarUsuario(usuarioId: string) {
    if (!grupoId) return
    try {
      await quitar.mutateAsync({ grupoId, usuarioId })
    } catch {
      // idem
    }
  }

  return (
    <Sheet open={grupoId !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Miembros — {grupo?.nombre ?? ""}</SheetTitle>
          <SheetDescription>
            {miembros.length} miembro{miembros.length !== 1 ? "s" : ""} activo{miembros.length !== 1 ? "s" : ""}.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 px-4 space-y-6">
          {/* Miembros actuales */}
          <div>
            <h3 className="text-sm font-semibold mb-2">En el grupo</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : miembros.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin miembros todavía.</p>
            ) : (
              <ul className="space-y-1">
                {miembros.map((m) => (
                  <li
                    key={m.usuarioId}
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {[m.apellido, m.nombre].filter(Boolean).join(", ") || m.email || m.usuarioId}
                      </p>
                      {m.email && (
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600"
                      title="Quitar del grupo"
                      disabled={quitar.isPending}
                      onClick={() => quitarUsuario(m.usuarioId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Buscar y agregar */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Agregar usuario</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="pl-8"
              />
            </div>

            <ul className="mt-3 space-y-1 max-h-72 overflow-y-auto">
              {candidatos.length === 0 ? (
                <li className="text-sm text-muted-foreground italic">
                  {busqueda ? "Sin coincidencias." : "Escribí para buscar usuarios."}
                </li>
              ) : (
                candidatos.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-2 rounded-md border border-gray-100 hover:bg-gray-50 px-2 py-1.5 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {[u.apellido, u.nombre].filter(Boolean).join(", ") || u.email}
                      </p>
                      {u.email && (
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
