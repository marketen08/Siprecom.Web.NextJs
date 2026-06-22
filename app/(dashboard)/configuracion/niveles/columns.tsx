"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Nivel } from "@/features/niveles/types"
import { useOpenNivel } from "@/features/niveles/hooks/use-open-nivel"
import { useDeleteNivel } from "@/features/niveles/api/use-delete-nivel"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ nivel }: { nivel: Nivel }) {
  const { open } = useOpenNivel()
  const deleteMutation = useDeleteNivel()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(nivel.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar nivel?"
        description={
          <>
            Esta acción eliminará <strong>{nivel.nombre}</strong>. Podés reactivarlo después.
            Si el nivel está en uso por tareas, no se podrá eliminar.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(nivel.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<Nivel>[] = [
  {
    accessorKey: "posicion",
    header: "Posición",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.posicion}</span>
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
    id: "actions",
    cell: ({ row }) => <RowActions nivel={row.original} />,
  },
]
