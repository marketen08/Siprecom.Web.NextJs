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

export default function PlanillasGruposPage() {
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
          <h1 className="text-2xl font-semibold">Grupos de planillas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Agrupan planillas para segregar qué usan cada proyecto. Un proyecto
            que declara grupos habilitados solo puede usar planillas de esos
            grupos — más las planillas sin grupo, que quedan disponibles en todos
            los proyectos.
          </p>
        </div>
        <Button
          onClick={() => { setError(null); setEditSheet({
            mode: "new", nombre: "", descripcion: "",
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
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Planillas</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">En proyectos</TableHead>
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
                  No hay grupos de planillas cargados.
                </TableCell>
              </TableRow>
            ) : (
              items.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.nombre}</TableCell>
                  <TableCell className="text-sm text-gray-600">{g.descripcion || "—"}</TableCell>
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
                      title="Gestionar planillas del grupo"
                      onClick={() => { setError(null); setPlanillasSheetId(g.id) }}
                    >
                      <FileText className="h-4 w-4" />
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

      {/* Sheet crear/editar */}
      <Sheet open={editSheet !== null} onOpenChange={(v) => !v && setEditSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editSheet?.mode === "new" ? "Nuevo grupo" : "Editar grupo"}</SheetTitle>
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

      {/* Sheet planillas del grupo */}
      <PlanillasSheet
        grupoId={planillasSheetId}
        onClose={() => setPlanillasSheetId(null)}
      />

      {/* Confirmación de delete */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => { if (!v) { setConfirmDelete(null); setError(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grupo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el grupo <strong>{confirmDelete?.nombre}</strong>? Se dan de baja
              las asignaciones activas del grupo (soft-delete). Las planillas en sí no se tocan.
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

// ─── Sheet gestión de planillas del grupo ───────────────────────────────

function PlanillasSheet({ grupoId, onClose }: { grupoId: string | null; onClose: () => void }) {
  const { data: detalle, isLoading } = useGetPlanillaGrupo(grupoId)
  const [busqueda, setBusqueda] = useState("")
  const { data: planillasData } = useGetPlanillasSelect()

  const asignar = useAsignarPlanillasAGrupo()
  const quitar = useQuitarPlanillaDeGrupo()

  const grupo = detalle?.data
  const planillas = grupo?.planillas ?? []
  const planillaIds = useMemo(() => new Set(planillas.map((p) => p.planillaId)), [planillas])

  const todas = (planillasData as any)?.data ?? []
  const candidatas = todas
    .filter((p: any) => !planillaIds.has(p.id))
    .filter((p: any) => {
      if (!busqueda.trim()) return true
      const q = busqueda.trim().toLowerCase()
      return p.nombre.toLowerCase().includes(q) || (p.codigo ?? "").toLowerCase().includes(q)
    })

  async function agregarPlanilla(planillaId: string) {
    if (!grupoId) return
    try {
      await asignar.mutateAsync({ grupoId, planillaIds: [planillaId] })
    } catch {
      // El error del backend queda en el mutation state; en la lista no
      // mostramos toast (patrón ConfirmActionDialog aplica en otros lados).
    }
  }

  async function quitarPlanilla(planillaId: string) {
    if (!grupoId) return
    try {
      await quitar.mutateAsync({ grupoId, planillaId })
    } catch {
      // idem
    }
  }

  return (
    <Sheet open={grupoId !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Planillas — {grupo?.nombre ?? ""}</SheetTitle>
          <SheetDescription>
            {planillas.length} planilla{planillas.length !== 1 ? "s" : ""} asignada{planillas.length !== 1 ? "s" : ""}.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 px-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">En el grupo</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : planillas.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin planillas asignadas todavía.</p>
            ) : (
              <ul className="space-y-1">
                {planillas.map((p) => (
                  <li
                    key={p.planillaId}
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.planillaNombre}</p>
                      {p.planillaCodigo && (
                        <p className="text-xs text-muted-foreground font-mono truncate">{p.planillaCodigo}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600"
                      title="Quitar del grupo"
                      disabled={quitar.isPending}
                      onClick={() => quitarPlanilla(p.planillaId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Agregar planilla</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="pl-8"
              />
            </div>

            <ul className="mt-3 space-y-1 max-h-72 overflow-y-auto">
              {candidatas.length === 0 ? (
                <li className="text-sm text-muted-foreground italic">
                  {busqueda ? "Sin coincidencias." : "Escribí para buscar planillas."}
                </li>
              ) : (
                candidatas.map((p: any) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border border-gray-100 hover:bg-gray-50 px-2 py-1.5 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.nombre}</p>
                      {p.codigo && (
                        <p className="text-xs text-muted-foreground font-mono truncate">{p.codigo}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
