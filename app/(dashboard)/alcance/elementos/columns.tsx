"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Elemento } from "@/features/elementos/types"
import { useOpenElemento } from "@/features/elementos/hooks/use-open-elemento"
import { useDeleteElemento } from "@/features/elementos/api/use-delete-elemento"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

export const PRIORIDAD_COLOR: Record<number, string> = {
  1: "text-green-600",
  2: "text-blue-600",
  3: "text-orange-500",
  4: "text-red-600",
}

export function RowActions({ elemento }: { elemento: Elemento }) {
  const { open } = useOpenElemento()
  const deleteMutation = useDeleteElemento()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(elemento.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar elemento?"
        description={
          <div className="space-y-2">
            <p>
              Esta acción eliminará <strong>{elemento.tag} — {elemento.nombre}</strong>.
              Podés reactivarlo después.
            </p>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
              <p className="font-medium">Qué pasa con sus tareas:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>
                  Las tareas <strong>pendientes</strong> se cancelan automáticamente.
                </li>
                <li>
                  Si el elemento tiene tareas <strong>iniciadas</strong> (en curso, completadas,
                  aprobadas, rechazadas o firmadas), el borrado se <strong>bloquea</strong>. Revertí
                  o cancelá esas tareas primero desde la vista de tareas.
                </li>
                <li>
                  Si el elemento tiene <strong>registros cargados</strong> (aunque estén en
                  borrador), el borrado se bloquea  — desestimalos o eliminalos antes.
                </li>
              </ul>
            </div>
          </div>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(elemento.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<Elemento>[] = [
  {
    accessorKey: "codigo",
    header: "Cód.",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{row.original.codigo}</span>
    ),
  },
  {
    accessorKey: "tag",
    header: "TAG",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.original.tag}</span>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nombre}</span>
    ),
  },
  {
    accessorKey: "subSistemaCodigo",
    header: "Subsistema",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground" title={row.original.subSistemaNombre ?? undefined}>
        {row.original.subSistemaCodigo ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "elementoTipoNombre",
    header: "Tipo",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.elementoTipoNombre ?? "—"}</span>
    ),
  },
  {
    accessorKey: "elementoTipoEspecialidadNombre",
    header: "Especialidad",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.elementoTipoEspecialidadNombre ?? "—"}</span>
    ),
  },
  {
    accessorKey: "prioridad",
    header: "Prioridad",
    cell: ({ row }) => (
      <span className={`text-sm font-medium ${PRIORIDAD_COLOR[row.original.prioridad] ?? ""}`}>
        {row.original.prioridadTexto || "—"}
      </span>
    ),
  },
  {
    accessorKey: "pid",
    header: "PID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.original.pid || "—"}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions elemento={row.original} />,
  },
]
