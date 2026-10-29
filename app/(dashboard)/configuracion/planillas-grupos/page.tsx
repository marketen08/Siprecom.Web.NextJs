"use client"

import { useMemo, useState } from "react"
import { FileText, Pencil, Plus, Trash2, X, Search } from "lucide-react"

import {
  useAsignarPlanillasAGrupo,
  useCreatePlanillaGrupo,
  useDeletePlanillaGrupo,
  useGetPlanillaGrupo,
  useGetPlanillasGrupos,
  useQuitarPlanillaDeGrupo,
  useUpdatePlanillaGrupo,
} from "@/features/planillas-grupos/api/use-planillas-grupos"
import { useGetPlanillasSelect } from "@/features/planillas/api/use-get-planillas-select"
import type { Planilla } from "@/features/planillas/types"
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

interface EditSheetState {
  mode: "new" | "edit"
  id?: string
  nombre: string
  descripcion: string
}

/** Por qué una colección no se puede tocar. El backend ya resolvió `puedeEditar`. */
function motivoNoEditable(g: { equipoNombre?: string | null }): string {
  return g.equipoNombre
    ? `La administra el equipo ${g.equipoNombre}`
    : "Es una colección global: agrupa las planillas de la casa y la administra un AdminGlobal."
}

export default function PlanillasGruposPage() {
  const hayColecciones = useFuncionalidadPlataforma(FUNCIONALIDAD.coleccionesPlanillas)

  // Igual que en Equipos: el ABM va aparte para cortar antes de sus hooks.
  if (!hayColecciones) {
    return (
      <FuncionalidadDesactivada
        titulo="Las colecciones de planillas están desactivadas"
        descripcion="Con la funcionalidad apagada todo proyecto puede usar todas las planillas del catálogo, así que no hay nada que agrupar. Las colecciones que estaban cargadas no se borraron: vuelven a aplicar al reactivarla."
      />
    )
  }

  return <PlanillasGruposAdmin />
}

function PlanillasGruposAdmin() {
  // La estructura de equipos es apagable: apagada, la columna "Equipo" no dice nada y las
  // acciones no se acotan.
  const hayEquipos = useFuncionalidadPlataforma(FUNCIONALIDAD.equiposAdministracion)

  const { data, isLoading } = useGetPlanillasGrupos()
  const create = useCreatePlanillaGrupo()
  const update = useUpdatePlanillaGrupo()
  const remove = useDeletePlanillaGrupo()

  const items = data?.data ?? []
  const [editSheet, setEditSheet] = useState<EditSheetState | null>(null)
  const [planillasSheetId, setPlanillasSheetId] = useState<string | null>(null)
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
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Colecciones de planillas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Agrupan planillas para segregar qué usa cada proyecto. Un proyecto
            que declara colecciones habilitadas solo puede usar planillas de esas
            colecciones — más las planillas sin colección, que quedan disponibles
            en todos los proyectos. Una planilla puede estar en varias.
          </p>
        </div>
        <Button
          onClick={() => { setError(null); setEditSheet({
            mode: "new", nombre: "", descripcion: "",
          }) }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva colección
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Nombre</TableHead>
              <TableHead className="font-semibold text-gray-700">Descripción</TableHead>
              {hayEquipos && (
                <TableHead className="w-36 font-semibold text-gray-700">Equipo</TableHead>
              )}
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Planillas</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">En proyectos</TableHead>
              <TableHead className="w-40 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={hayEquipos ? 6 : 5} className="py-10 text-center text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hayEquipos ? 6 : 5} className="py-10 text-center text-muted-foreground">
                  No hay colecciones de planillas cargadas.
                </TableCell>
              </TableRow>
            ) : (
              items.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.nombre}</TableCell>
                  <TableCell className="text-sm text-gray-600">{g.descripcion || "—"}</TableCell>
                  {hayEquipos && (
                    <TableCell>
                      {/* Mismo badge que en planillas, campos y procedimientos. */}
                      {!g.equipoId ? (
                        <span
                          className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
                          title="Global: agrupa las planillas de la casa. La administra un AdminGlobal."
                        >
                          Global
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
                          title={g.puedeEditar === false
                            ? `La administra el equipo ${g.equipoNombre}`
                            : "La administra tu equipo"}
                        >
                          {g.equipoNombre}
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right tabular-nums">{g.cantidadPlanillas}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g.proyectosEnUso > 0 ? (
                      <span
                        className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium"
                        title={`Habilitado en ${g.proyectosEnUso} proyecto(s). El delete se bloquea mientras existan estas referencias.`}
                      >
                        {g.proyectosEnUso}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={g.puedeEditar === false}
                      title={g.puedeEditar === false ? motivoNoEditable(g) : "Gestionar planillas de la colección"}
                      onClick={() => { setError(null); setPlanillasSheetId(g.id) }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={g.puedeEditar === false}
                      title={g.puedeEditar === false ? motivoNoEditable(g) : "Editar nombre/descripción"}
                      onClick={() => { setError(null); setEditSheet({
                        mode: "edit",
                        id: g.id,
                        nombre: g.nombre,
                        descripcion: g.descripcion ?? "",
                      }) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600"
                      disabled={g.puedeEditar === false}
                      title={g.puedeEditar === false ? motivoNoEditable(g) : "Eliminar colección"}
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

      <p className="text-sm text-muted-foreground">{items.length} colecciones</p>

      {/* Sheet crear/editar */}
      <Sheet open={editSheet !== null} onOpenChange={(v) => !v && setEditSheet(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editSheet?.mode === "new" ? "Nueva colección" : "Editar colección"}</SheetTitle>
            <SheetDescription>
              Las planillas se asignan desde el botón <FileText className="inline h-3.5 w-3.5 align-text-bottom" /> en la fila.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={editSheet?.nombre ?? ""}
                onChange={(e) => setEditSheet(editSheet ? { ...editSheet, nombre: e.target.value } : editSheet)}
                placeholder="Ej: HSE Refinería"
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
            {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={guardar}
                disabled={!editSheet?.nombre.trim() || create.isPending || update.isPending}
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

      {/* Sheet planillas de la colección */}
      <PlanillasSheet
        grupoId={planillasSheetId}
        onClose={() => setPlanillasSheetId(null)}
      />

      {/* Confirmación de delete */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => { if (!v) { setConfirmDelete(null); setError(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar colección</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la colección <strong>{confirmDelete?.nombre}</strong>? Se dan de baja
              las asignaciones activas de la colección (soft-delete). Las planillas en sí no se tocan.
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

// ─── Sheet gestión de planillas de la colección ───────────────────────────────

/**
 * Qué planillas tiene la colección, con el mismo transfer que el acceso a equipos:
 * disponibles a la izquierda, asignadas a la derecha.
 */
function PlanillasSheet({ grupoId, onClose }: { grupoId: string | null; onClose: () => void }) {
  const { data: detalle, isLoading } = useGetPlanillaGrupo(grupoId)
  const { data: planillasData } = useGetPlanillasSelect()
  const asignar = useAsignarPlanillasAGrupo()
  const quitar = useQuitarPlanillaDeGrupo()

  const [busqueda, setBusqueda] = useState("")
  const [filtroAsignadas, setFiltroAsignadas] = useState("")
  const [error, setError] = useState<string | null>(null)

  const grupo = detalle?.data
  // Memoizado: es dependencia de los useMemo de abajo.
  const planillas = useMemo(() => grupo?.planillas ?? [], [grupo])
  const planillaIds = useMemo(() => new Set(planillas.map((p) => p.planillaId)), [planillas])

  // Sólo las planillas del MISMO dueño que la colección. El backend lo valida igual, pero
  // ofrecer en el selector algo que va a rechazar es peor que no mostrarlo: el usuario lo
  // elige, falla, y no sabe por qué. Ver Docs/ANALISIS-COLECCIONES-POR-EQUIPO.md.
  //
  // La comparación normaliza null/undefined porque "global" viaja como null desde el backend
  // y como undefined cuando la propiedad no vino (JSON viejo).
  const duenoColeccion = grupo?.equipoId ?? null
  const delMismoDueno = useMemo(() => {
    const todas = (planillasData as { data?: Planilla[] } | undefined)?.data ?? []
    return todas.filter((p) => (p.equipoId ?? null) === duenoColeccion)
  }, [planillasData, duenoColeccion])

  const candidatas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return delMismoDueno
      .filter((p) => !planillaIds.has(p.id))
      .filter((p) =>
        !q || p.nombre.toLowerCase().includes(q) || (p.codigo ?? "").toLowerCase().includes(q))
  }, [delMismoDueno, planillaIds, busqueda])

  const asignadasFiltradas = useMemo(() => {
    const q = filtroAsignadas.trim().toLowerCase()
    if (!q) return planillas
    return planillas.filter((p) =>
      p.planillaNombre.toLowerCase().includes(q) || (p.planillaCodigo ?? "").toLowerCase().includes(q))
  }, [planillas, filtroAsignadas])

  // Al abrir otra colección no tiene que quedar el error ni la búsqueda de la anterior.
  function cerrar() {
    setBusqueda("")
    setFiltroAsignadas("")
    setError(null)
    onClose()
  }

  async function agregarPlanilla(planillaId: string) {
    if (!grupoId) return
    setError(null)
    try { await asignar.mutateAsync({ grupoId, planillaIds: [planillaId] }) }
    catch (e) { setError((e as Error).message) }
  }

  async function quitarPlanilla(planillaId: string) {
    if (!grupoId) return
    setError(null)
    try { await quitar.mutateAsync({ grupoId, planillaId }) }
    catch (e) { setError((e as Error).message) }
  }

  const textoDueno = grupo?.equipoNombre
    ? `Planillas del equipo ${grupo.equipoNombre} que no están en la colección.`
    : "Planillas globales que no están en la colección."

  return (
    <Sheet open={grupoId !== null} onOpenChange={(v) => !v && cerrar()}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-4xl!">
        <SheetHeader>
          <SheetTitle>Planillas — {grupo?.nombre ?? ""}</SheetTitle>
          <SheetDescription>
            Sumá desde la izquierda, quitá desde la derecha. Una planilla que entra en su
            primera colección deja de estar disponible en los proyectos que no la habilitan.
          </SheetDescription>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 gap-4 px-4 pb-4 md:grid-cols-2">
          <section className="flex min-h-0 flex-col rounded-lg border">
            <header className="border-b bg-gray-50 px-3 py-2">
              <h3 className="text-sm font-semibold">Disponibles</h3>
              <p className="text-xs text-muted-foreground">{textoDueno}</p>
            </header>

            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o código…"
                  className="pl-8"
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {candidatas.length === 0 ? (
                <li className="p-2 text-sm italic text-muted-foreground">
                  {busqueda
                    ? "Sin coincidencias."
                    : delMismoDueno.length === 0
                      ? (grupo?.equipoNombre
                          ? `El equipo ${grupo.equipoNombre} no tiene planillas.`
                          : "No hay planillas globales.")
                      : "Todas las planillas ya están en la colección."}
                </li>
              ) : (
                candidatas.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.nombre}</p>
                      {p.codigo && (
                        <p className="truncate font-mono text-xs text-muted-foreground">{p.codigo}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 gap-1"
                      disabled={asignar.isPending}
                      onClick={() => agregarPlanilla(p.id)}
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
                En la colección{" "}
                <span className="font-normal tabular-nums text-muted-foreground">
                  ({planillas.length})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Quitar una planilla no la borra: sólo sale de esta colección.
              </p>
            </header>

            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filtroAsignadas}
                  onChange={(e) => setFiltroAsignadas(e.target.value)}
                  placeholder="Filtrar asignadas…"
                  className="pl-8"
                  disabled={planillas.length === 0}
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {isLoading ? (
                <li className="p-2 text-sm text-muted-foreground">Cargando…</li>
              ) : planillas.length === 0 ? (
                <li className="p-2 text-sm italic text-muted-foreground">
                  Sin planillas asignadas todavía.
                </li>
              ) : asignadasFiltradas.length === 0 ? (
                <li className="p-2 text-sm italic text-muted-foreground">Sin coincidencias.</li>
              ) : (
                asignadasFiltradas.map((p) => (
                  <li
                    key={p.planillaId}
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.planillaNombre}</p>
                      {p.planillaCodigo && (
                        <p className="truncate font-mono text-xs text-muted-foreground">{p.planillaCodigo}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={quitar.isPending}
                      onClick={() => quitarPlanilla(p.planillaId)}
                      aria-label="Quitar de la colección"
                      title="Quitar de la colección"
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
          <p className="mx-4 mb-4 whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </SheetContent>
    </Sheet>
  )
}
