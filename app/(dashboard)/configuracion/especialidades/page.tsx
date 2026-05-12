"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import {
  useCreateEspecialidad,
  useDeleteEspecialidad,
  useGetEspecialidades,
  useUpdateEspecialidad,
} from "@/features/especialidades/api/use-especialidades"

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

interface SheetState {
  mode: "new" | "edit"
  id?: string
  nombre: string
  codigo: string
  color: string
}

const COLOR_DEFAULT = "#64748b" // slate-500

export default function EspecialidadesPage() {
  const { data, isLoading } = useGetEspecialidades()
  const create = useCreateEspecialidad()
  const update = useUpdateEspecialidad()
  const remove = useDeleteEspecialidad()

  const items = data?.data ?? []
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!sheet || !sheet.nombre.trim()) return
    setError(null)
    try {
      const payload = {
        nombre: sheet.nombre.trim(),
        codigo: sheet.codigo.trim() || undefined,
        color: sheet.color.trim() || undefined,
      }
      if (sheet.mode === "new") await create.mutateAsync(payload)
      else await update.mutateAsync({ id: sheet.id!, ...payload })
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
          <h1 className="text-2xl font-semibold">Especialidades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catálogo global de disciplinas (Mecánica, Eléctrica, Instrumentación, etc).
            Se usa en tipos de elemento y pendientes.
          </p>
        </div>
        <Button
          onClick={() => setSheet({ mode: "new", nombre: "", codigo: "", color: COLOR_DEFAULT })}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva especialidad
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 font-semibold text-gray-700">Color</TableHead>
              <TableHead className="font-semibold text-gray-700">Nombre</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700">Código</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No hay especialidades cargadas.
                </TableCell>
              </TableRow>
            ) : (
              items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <span
                      className="inline-block h-5 w-5 rounded border border-gray-200"
                      style={{ backgroundColor: e.color || "#e5e7eb" }}
                      aria-label={`Color ${e.color ?? "sin definir"}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{e.nombre}</TableCell>
                  <TableCell className="font-mono text-sm text-gray-600">{e.codigo ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setSheet({
                        mode: "edit",
                        id: e.id,
                        nombre: e.nombre,
                        codigo: e.codigo ?? "",
                        color: e.color ?? COLOR_DEFAULT,
                      })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600"
                      onClick={() => setConfirmDelete({ id: e.id, nombre: e.nombre })}
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

      <p className="text-sm text-muted-foreground">{items.length} especialidades</p>

      {/* Sheet crear/editar */}
      <Sheet open={sheet !== null} onOpenChange={(v) => !v && setSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheet?.mode === "new" ? "Nueva especialidad" : "Editar especialidad"}</SheetTitle>
            <SheetDescription>
              Disciplina técnica usada por tipos de elemento y pendientes.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={sheet?.nombre ?? ""}
                onChange={(e) => setSheet(sheet ? { ...sheet, nombre: e.target.value } : sheet)}
                placeholder="Ej: Mecánica"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Código corto</label>
              <Input
                value={sheet?.codigo ?? ""}
                onChange={(e) => setSheet(sheet ? { ...sheet, codigo: e.target.value } : sheet)}
                placeholder="Ej: MEC"
                className="mt-1"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">Opcional. Hasta 20 caracteres.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={sheet?.color || COLOR_DEFAULT}
                  onChange={(e) => setSheet(sheet ? { ...sheet, color: e.target.value } : sheet)}
                  className="h-9 w-12 rounded border border-gray-200 cursor-pointer"
                />
                <Input
                  value={sheet?.color ?? ""}
                  onChange={(e) => setSheet(sheet ? { ...sheet, color: e.target.value } : sheet)}
                  placeholder="#2563eb"
                  className="font-mono text-sm"
                  maxLength={9}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Hex #RRGGBB. Usado en gráficos para identificar la especialidad.
              </p>
            </div>
            {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={guardar}
                disabled={!sheet?.nombre.trim() || create.isPending || update.isPending}
                className="flex-1"
              >
                {create.isPending || update.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" onClick={() => setSheet(null)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmación de delete */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar especialidad</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la especialidad <strong>{confirmDelete?.nombre}</strong>?
              Si hay tipos de elemento o pendientes activos que la usan, el backend rechaza la eliminación.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
