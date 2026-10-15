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
  useImpactoQuitarMiembro,
} from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"
import type { UsuarioGrupo } from "@/features/usuarios-grupos/types"

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
 * Los cuatro estados por los que se puede filtrar. "sin-uso" no es un flag del backend
 * sino la ausencia de los tres: son grupos legacy de antes de la regla que exige declarar
 * al menos un uso, y poder aislarlos es justamente lo que permite arreglarlos.
 */
type UsoFiltro = "pendientes" | "acceso-proyecto" | "calidad" | "sin-uso"

const CUMPLE_USO: Record<UsoFiltro, (g: UsuarioGrupo) => boolean> = {
  "pendientes": (g) => g.usoPendientes,
  "acceso-proyecto": (g) => g.usoAccesoProyecto,
  "calidad": (g) => g.usoCalidad,
  "sin-uso": (g) => !g.usoPendientes && !g.usoAccesoProyecto && !g.usoCalidad,
}

/**
 * Cada chip usa el color del badge que la fila ya muestra para ese uso. Que coincidan es
 * lo que hace que el filtro se lea sin leyenda: el chip ámbar y el badge ámbar son la
 * misma cosa.
 */
const CHIPS: { uso: UsoFiltro; label: string; activo: string }[] = [
  { uso: "pendientes", label: "Pendientes", activo: "bg-amber-50 text-amber-800 border-amber-300" },
  { uso: "acceso-proyecto", label: "Acceso a proyecto", activo: "bg-blue-50 text-blue-800 border-blue-300" },
  { uso: "calidad", label: "Calidad", activo: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  { uso: "sin-uso", label: "Sin uso", activo: "bg-gray-100 text-gray-800 border-gray-400" },
]

interface EditSheetState {
  mode: "new" | "edit"
  id?: string
  nombre: string
  descripcion: string
  usoPendientes: boolean
  usoAccesoProyecto: boolean
  usoCalidad: boolean
}

export default function GruposUsuariosPage() {
  const { data, isLoading } = useGetUsuariosGrupos()
  const create = useCreateUsuarioGrupo()
  const update = useUpdateUsuarioGrupo()
  const remove = useDeleteUsuarioGrupo()

  const items = data?.data ?? []

  // Filtro por uso. La lista viene completa del server, así que se filtra en memoria:
  // son pocos grupos y evita un round-trip por cada clic.
  //
  // Multi-selección con OR: marcar Pendientes y Calidad muestra los que sirven para
  // alguna de las dos, que es lo que se busca al preguntar "¿qué tengo para esto?".
  // "Sin uso" entra en el mismo grupo de chips porque es lo que un admin quiere
  // encontrar para arreglarlo, y con OR convive bien con el resto.
  const [usosFiltro, setUsosFiltro] = useState<Set<UsoFiltro>>(new Set())

  function toggleUso(uso: UsoFiltro) {
    setUsosFiltro((prev) => {
      const next = new Set(prev)
      if (next.has(uso)) next.delete(uso)
      else next.add(uso)
      return next
    })
  }

  const itemsFiltrados = useMemo(() => {
    if (usosFiltro.size === 0) return items
    return items.filter((g) => [...usosFiltro].some((u) => CUMPLE_USO[u](g)))
  }, [items, usosFiltro])

  const [editSheet, setEditSheet] = useState<EditSheetState | null>(null)
  const [miembrosSheetId, setMiembrosSheetId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!editSheet || !editSheet.nombre.trim()) return
    // Guard local — al menos un uso declarado. El backend también valida,
    // pero acá lo cortamos antes para no gastar el request.
    if (!editSheet.usoPendientes && !editSheet.usoAccesoProyecto && !editSheet.usoCalidad) {
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
        usoCalidad: editSheet.usoCalidad,
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
            // Todos los usos arrancan en false — el usuario tiene que marcar
            // explícitamente para qué se usa el grupo. La validación local +
            // backend exige al menos uno antes de guardar.
            usoPendientes: false,
            usoAccesoProyecto: false,
            usoCalidad: false,
          }) }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo grupo
        </Button>
      </div>

      {/* Filtro por uso. Cuatro opciones y un solo criterio: un Sheet de filtros sería
          más ceremonia que la pregunta. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Se usa en:</span>
        {CHIPS.map((chip) => {
          const activo = usosFiltro.has(chip.uso)
          const cuantos = items.filter(CUMPLE_USO[chip.uso]).length
          return (
            <button
              key={chip.uso}
              type="button"
              onClick={() => toggleUso(chip.uso)}
              aria-pressed={activo}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (activo
                  ? chip.activo
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
              }
            >
              {chip.label}
              <span className="tabular-nums opacity-60">{cuantos}</span>
            </button>
          )
        })}
        {usosFiltro.size > 0 && (
          <button
            type="button"
            onClick={() => setUsosFiltro(new Set())}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            Limpiar
          </button>
        )}
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
            ) : itemsFiltrados.length === 0 ? (
              // Vacío por el filtro, no por falta de datos: el mensaje tiene que
              // distinguirlo o parece que se perdieron los grupos.
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Ningún grupo coincide con el filtro.
                </TableCell>
              </TableRow>
            ) : (
              itemsFiltrados.map((g) => (
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
                      {g.usoCalidad && (
                        <span className="inline-flex items-center rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-medium">
                          Calidad
                        </span>
                      )}
                      {/* Grupos activos nuevos siempre tienen al menos un uso
                          (regla de validación). Los que no aparecen acá son
                          legacy de antes de la regla — quedan silenciados y se
                          arreglan al primer edit. */}
                      {!g.usoPendientes && !g.usoAccesoProyecto && !g.usoCalidad && (
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
                        usoCalidad: g.usoCalidad,
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
                  Pendientes <span className="text-xs text-muted-foreground">(grupo responsable + matriz de autorización)</span>
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
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                    checked={editSheet?.usoCalidad ?? true}
                    onChange={(e) => setEditSheet(editSheet ? { ...editSheet, usoCalidad: e.target.checked } : editSheet)}
                  />
                  Calidad <span className="text-xs text-muted-foreground">(área afectada/seguimiento + matriz de autorización)</span>
                </label>
                {/* (Checkbox "Visibilidad de pendientes" eliminado 2026-09 —
                    el modelo de "grupo de visibilidad" separable se reemplazó
                    por el ámbito del pendiente: la audiencia vive en el catálogo de ámbitos.) */}
              </div>
              {editSheet
                && !editSheet.usoPendientes
                && !editSheet.usoAccesoProyecto
                && !editSheet.usoCalidad && (
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
                  || (!editSheet.usoPendientes && !editSheet.usoAccesoProyecto && !editSheet.usoCalidad)
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

  // Quitar a alguien pasa por confirmación porque los grupos son globales: la membresía
  // puede estar sosteniendo visibilidad y permisos en proyectos que quien la quita no
  // administra, y hasta ahora eso se hacía a ciegas. El diálogo consulta el impacto real.
  const [confirmQuitar, setConfirmQuitar] = useState<{ usuarioId: string; nombre: string } | null>(null)

  async function quitarUsuario(usuarioId: string) {
    if (!grupoId) return
    try {
      await quitar.mutateAsync({ grupoId, usuarioId })
      setConfirmQuitar(null)
    } catch {
      // idem
    }
  }

  // Filtro local del lado derecho. El de la izquierda va contra el server
  // (useGetUsuarios); acá alcanza con filtrar en memoria porque los miembros ya
  // están todos cargados en el detalle del grupo.
  const [filtroMiembros, setFiltroMiembros] = useState("")
  const miembrosFiltrados = useMemo(() => {
    const q = filtroMiembros.trim().toLowerCase()
    if (!q) return miembros
    return miembros.filter((m) =>
      [m.apellido, m.nombre, m.email].filter(Boolean).join(" ").toLowerCase().includes(q),
    )
  }, [miembros, filtroMiembros])

  // El backend devuelve como mucho 50: si se llega al tope, puede haber usuarios
  // que no se ven y conviene avisarlo en vez de que parezca que no existen.
  const hayMasCandidatos = (usuariosData?.data ?? []).length >= 50

  return (
    <Sheet open={grupoId !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-4xl!">
        <SheetHeader>
          <SheetTitle>Miembros — {grupo?.nombre ?? ""}</SheetTitle>
          <SheetDescription>
            {miembros.length} miembro{miembros.length !== 1 ? "s" : ""} activo
            {miembros.length !== 1 ? "s" : ""}. Agregá desde la izquierda, quitá desde la
            derecha.
          </SheetDescription>
        </SheetHeader>

        {/* Dos columnas de alto fijo con scroll independiente: mover gente entre
            listas sin que se mueva el layout es lo que hace usable el transfer. */}
        <div className="grid min-h-0 flex-1 gap-4 px-4 pb-4 md:grid-cols-2">
          {/* ── Disponibles ── */}
          <section className="flex min-h-0 flex-col rounded-lg border">
            <header className="border-b bg-gray-50 px-3 py-2">
              <h3 className="text-sm font-semibold">Disponibles</h3>
              <p className="text-xs text-muted-foreground">
                Usuarios activos que no están en el grupo.
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
              {hayMasCandidatos && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Mostrando los primeros 50. Refiná la búsqueda si no encontrás a alguien.
                </p>
              )}
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {candidatos.length === 0 ? (
                <li className="p-2 text-sm italic text-muted-foreground">
                  {busqueda ? "Sin coincidencias." : "No hay usuarios disponibles."}
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
                      {u.email && (
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 gap-1"
                      title="Agregar al grupo"
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

          {/* ── En el grupo ── */}
          <section className="flex min-h-0 flex-col rounded-lg border">
            <header className="border-b bg-gray-50 px-3 py-2">
              <h3 className="text-sm font-semibold">
                En el grupo{" "}
                <span className="font-normal tabular-nums text-muted-foreground">
                  ({miembros.length})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Quitar a alguien no lo da de baja, solo lo saca del grupo.
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
                  Sin miembros todavía.
                </li>
              ) : miembrosFiltrados.length === 0 ? (
                <li className="p-2 text-sm italic text-muted-foreground">
                  Sin coincidencias.
                </li>
              ) : (
                miembrosFiltrados.map((m) => (
                  <li
                    key={m.usuarioId}
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {[m.apellido, m.nombre].filter(Boolean).join(", ") ||
                          m.email ||
                          m.usuarioId}
                      </p>
                      {m.email && (
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-red-600"
                      title="Quitar del grupo"
                      disabled={quitar.isPending}
                      onClick={() =>
                        setConfirmQuitar({
                          usuarioId: m.usuarioId,
                          nombre:
                            [m.apellido, m.nombre].filter(Boolean).join(", ") ||
                            m.email ||
                            m.usuarioId,
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </SheetContent>

      {/* Confirmación de quitar miembro, con el impacto real a la vista. */}
      <ConfirmarQuitarMiembro
        grupoId={grupoId}
        target={confirmQuitar}
        onCancel={() => setConfirmQuitar(null)}
        onConfirm={() => confirmQuitar && quitarUsuario(confirmQuitar.usuarioId)}
        quitando={quitar.isPending}
      />
    </Sheet>
  )
}

/**
 * Confirmación de quitar a alguien de un grupo, mostrando qué pierde.
 *
 * Los grupos son globales pero sus efectos no: la membresía puede estar sosteniendo
 * visibilidad y permisos en proyectos que quien la quita no administra. El impacto lo
 * calcula el backend —el front no sabe en qué otros grupos está la persona— y viene neto:
 * lo que otro grupo suyo cubre no se lista.
 *
 * No bloquea nada. Sacar a alguien de un grupo casi siempre es intencional; lo que
 * faltaba era que la consecuencia estuviera a la vista antes de confirmar.
 */
function ConfirmarQuitarMiembro({
  grupoId,
  target,
  onCancel,
  onConfirm,
  quitando,
}: {
  grupoId: string | null
  target: { usuarioId: string; nombre: string } | null
  onCancel: () => void
  onConfirm: () => void
  quitando: boolean
}) {
  const { data, isLoading } = useImpactoQuitarMiembro(grupoId, target?.usuarioId ?? null)
  const impacto = data?.data

  const ajenos = impacto?.permisosQuePierde.filter((p) => !p.esProyectoPropio) ?? []

  return (
    <AlertDialog open={target !== null} onOpenChange={(v) => { if (!v) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quitar a {target?.nombre} del grupo</AlertDialogTitle>
          <AlertDialogDescription>
            No se da de baja al usuario, sólo se lo saca de este grupo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Revisando qué depende de esta membresía…</p>
        ) : impacto?.sinImpacto ? (
          <p className="text-sm text-muted-foreground">
            Esta membresía no sostiene visibilidad ni permisos en ningún proyecto.
          </p>
        ) : impacto ? (
          <div className="space-y-3 text-sm">
            {ajenos.length > 0 && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Parte de esto afecta a proyectos que no administrás.
              </p>
            )}

            {impacto.ambitosQueDejaDeVer.length > 0 && (
              <div>
                <p className="font-medium">Deja de ver estos ámbitos de pendientes:</p>
                <p className="text-muted-foreground">
                  {impacto.ambitosQueDejaDeVer.join(", ")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sus pendientes le desaparecen del listado y no va a poder accionarlos.
                </p>
              </div>
            )}

            {impacto.permisosQuePierde.length > 0 && (
              <div>
                <p className="font-medium">Pierde estos permisos:</p>
                <ul className="mt-1 space-y-1">
                  {impacto.permisosQuePierde.map((p) => (
                    <li
                      key={`${p.proyectoId}-${p.ambitoNombre}`}
                      className="rounded-md border px-2 py-1.5"
                    >
                      <span className="font-medium">{p.proyectoNombre}</span>
                      {!p.esProyectoPropio && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          otro proyecto
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {p.ambitoNombre} · {p.acciones.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {impacto.pendientesQueSalenDeMios > 0 && (
              <p className="text-muted-foreground">
                {impacto.pendientesQueSalenDeMios} pendiente
                {impacto.pendientesQueSalenDeMios === 1 ? "" : "s"} sale
                {impacto.pendientesQueSalenDeMios === 1 ? "" : "n"} de su bandeja
                &quot;Míos&quot;.
              </p>
            )}

            {impacto.noConformidadesAfectadas > 0 && (
              <p className="text-muted-foreground">
                {impacto.noConformidadesAfectadas} no conformidad
                {impacto.noConformidadesAfectadas === 1 ? "" : "es"} tiene a este grupo como
                área afectada o de seguimiento.
              </p>
            )}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={quitando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={quitando || isLoading}
            onClick={(e) => { e.preventDefault(); onConfirm() }}
          >
            {quitando ? "Quitando…" : "Quitar del grupo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
