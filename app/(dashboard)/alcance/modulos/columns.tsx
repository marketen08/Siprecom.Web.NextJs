"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Modulo } from "@/features/modulos/types"
import { useOpenModulo } from "@/features/modulos/hooks/use-open-modulo"
import { useDeleteModulo } from "@/features/modulos/api/use-delete-modulo"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ modulo }: { modulo: Modulo }) {
  const { open } = useOpenModulo()
  const deleteMutation = useDeleteModulo()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(modulo.id)}>
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar módulo?"
        description={
          <>
            Esta acción eliminará <strong>{modulo.nombre}</strong>. Podés reactivarlo después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(modulo.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<Modulo>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.codigo}</span>,
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {row.original.descripcion ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "createdByNombre",
    header: "Creado por",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.createdByNombre}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions modulo={row.original} />,
  },
]
