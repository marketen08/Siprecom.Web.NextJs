"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Procedimiento } from "@/features/procedimientos/types"
import { useOpenProcedimiento } from "@/features/procedimientos/hooks/use-open-procedimiento"
import { useDeleteProcedimiento } from "@/features/procedimientos/api/use-delete-procedimiento"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ procedimiento }: { procedimiento: Procedimiento }) {
  const { open } = useOpenProcedimiento()
  const deleteMutation = useDeleteProcedimiento()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(procedimiento.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar procedimiento?"
        description={
          <>
            Esta acción eliminará <strong>{procedimiento.nombre}</strong>. Podés reactivarlo después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(procedimiento.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<Procedimiento>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nombre}</span>
    ),
  },
  {
    accessorKey: "nombreArchivoId",
    header: "Archivo",
    cell: ({ row }) => (
      <span className="text-sm font-mono text-muted-foreground">
        {row.original.nombreArchivoId || "—"}
      </span>
    ),
  },
  {
    accessorKey: "observaciones",
    header: "Observaciones",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {row.original.observaciones || "—"}
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
    cell: ({ row }) => <RowActions procedimiento={row.original} />,
  },
]
