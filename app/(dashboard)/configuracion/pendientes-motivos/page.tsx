"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import {
  useCreatePendienteMotivo,
  useDeletePendienteMotivo,
  useGetPendienteMotivos,
  useUpdatePendienteMotivo,
} from "@/features/pendientes/api/use-catalogos"

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

export default function PendientesMotivosPage() {
  const { data, isLoading } = useGetPendienteMotivos()
  const create = useCreatePendienteMotivo()
  const update = useUpdatePendienteMotivo()
  const remove = useDeletePendienteMotivo()

  const items = data?.data ?? []
  const [sheet, setSheet] = useState<{ mode: "new" | "edit"; id?: string; nombre: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!sheet || !sheet.nombre.trim()) return
    setError(null)
    try {
      if (sheet.mode === "new") await create.mutateAsync({ nombre: sheet.nombre.trim() })
      else await update.mutateAsync({ id: sheet.id!, nombre: sheet.nombre.trim() })
      setSheet(null)
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
          <h1 className="text-2xl font-semibold">Motivos de pendientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catálogo de motivos para el wizard de descripción (ej: Daño físico, Falta identificación, No cumple norma).
          </p>
        </div>
        <Button onClick={() => setSheet({ mode: "new", nombre: "" })} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo motivo
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Motivo</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={2} className="py-10 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="py-10 text-center text-muted-foreground">No hay motivos cargados.</TableCell></TableRow>
            ) : (
              items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nombre}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSheet({ mode: "edit", id: m.id, nombre: m.nombre })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setConfirmDelete({ id: m.id, nombre: m.nombre })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">{items.length} motivos</p>

      <Sheet open={sheet !== null} onOpenChange={(v) => !v && setSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheet?.mode === "new" ? "Nuevo motivo" : "Editar motivo"}</SheetTitle>
            <SheetDescription>
              Frase corta que describe por qué se pide la acción del pendiente.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Motivo</label>
              <Input
                value={sheet?.nombre ?? ""}
                onChange={(e) => setSheet(sheet ? { ...sheet, nombre: e.target.value } : sheet)}
                placeholder="Ej: Daño físico"
                className="mt-1"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button onClick={guardar} disabled={!sheet?.nombre.trim() || create.isPending || update.isPending} className="flex-1">
                {create.isPending || update.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" onClick={() => setSheet(null)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar motivo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el motivo <strong>{confirmDelete?.nombre}</strong>?
              Si hay pendientes activos usándolo, el backend rechaza la eliminación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={remove.isPending} onClick={(e) => { e.preventDefault(); eliminar() }}>
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
