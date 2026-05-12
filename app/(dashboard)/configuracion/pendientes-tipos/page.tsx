"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import {
  useCreatePendienteTipo,
  useDeletePendienteTipo,
  useGetPendienteTipos,
  useUpdatePendienteTipo,
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

export default function PendientesTiposPage() {
  const { data, isLoading } = useGetPendienteTipos()
  const create = useCreatePendienteTipo()
  const update = useUpdatePendienteTipo()
  const remove = useDeletePendienteTipo()

  const items = data?.data ?? []
  const [sheet, setSheet] = useState<{ mode: "new" | "edit"; id?: string; tipo: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; tipo: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!sheet || !sheet.tipo.trim()) return
    setError(null)
    try {
      if (sheet.mode === "new") await create.mutateAsync({ tipo: sheet.tipo.trim() })
      else await update.mutateAsync({ id: sheet.id!, tipo: sheet.tipo.trim() })
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
          <h1 className="text-2xl font-semibold">Tipos de pendientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catálogo de tipos que clasifican los pendientes (ej: Observación, Trabajo, Reclamo).
          </p>
        </div>
        <Button onClick={() => setSheet({ mode: "new", tipo: "" })} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo tipo
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Tipo</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={2} className="py-10 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="py-10 text-center text-muted-foreground">No hay tipos cargados.</TableCell></TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.tipo}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSheet({ mode: "edit", id: t.id, tipo: t.tipo })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setConfirmDelete({ id: t.id, tipo: t.tipo })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">{items.length} tipos</p>

      <Sheet open={sheet !== null} onOpenChange={(v) => !v && setSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheet?.mode === "new" ? "Nuevo tipo" : "Editar tipo"}</SheetTitle>
            <SheetDescription>
              Nombre del tipo que aparece en los selects del módulo de Pendientes.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Input
                value={sheet?.tipo ?? ""}
                onChange={(e) => setSheet(sheet ? { ...sheet, tipo: e.target.value } : sheet)}
                placeholder="Ej: Observación"
                className="mt-1"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button onClick={guardar} disabled={!sheet?.tipo.trim() || create.isPending || update.isPending} className="flex-1">
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
            <AlertDialogTitle>Eliminar tipo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el tipo <strong>{confirmDelete?.tipo}</strong>?
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
