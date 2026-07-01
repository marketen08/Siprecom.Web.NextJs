"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Area } from "@/features/areas/types"
import { useOpenArea } from "@/features/areas/hooks/use-open-area"
import { useDeleteArea } from "@/features/areas/api/use-delete-area"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ area }: { area: Area }) {
  const { open } = useOpenArea()
  const deleteMutation = useDeleteArea()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(area.id)}>
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar área?"
        description={
          <>
            Esta acción eliminará <strong>{area.nombre}</strong>. Podés reactivarla después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(area.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<Area>[] = [
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
    cell: ({ row }) => <RowActions area={row.original} />,
  },
]
