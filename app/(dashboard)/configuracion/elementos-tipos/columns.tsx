"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { ElementoTipo } from "@/features/elementostipos/types"
import { useOpenElementoTipo } from "@/features/elementostipos/hooks/use-open-elementotipo"
import { useDeleteElementoTipo } from "@/features/elementostipos/api/use-delete-elementotipo"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ tipo }: { tipo: ElementoTipo }) {
  const { open } = useOpenElementoTipo()
  const deleteMutation = useDeleteElementoTipo()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(tipo.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar tipo de elemento?"
        description={
          <>
            Esta acción eliminará <strong>{tipo.nombre}</strong>. Podés reactivarlo después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(tipo.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<ElementoTipo>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nombre}</span>
    ),
  },
  {
    accessorKey: "especialidadNombre",
    header: "Especialidad",
    cell: ({ row }) => {
      const nombre = row.original.especialidadNombre
      const color = row.original.especialidadColor
      const codigo = row.original.especialidadCodigo
      if (!nombre) return <span className="text-sm text-muted-foreground">—</span>
      return (
        <span className="inline-flex items-center gap-2 text-sm">
          {color && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <span className="text-gray-700">{codigo ? `${codigo} — ${nombre}` : nombre}</span>
        </span>
      )
    },
  },
  {
    accessorKey: "horasAdicionalesDefault",
    header: "Hs. adicionales",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.horasAdicionalesDefault}</span>
    ),
  },
  {
    accessorKey: "impactoFactorDefault",
    header: "Factor impacto",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.impactoFactorDefault}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions tipo={row.original} />,
  },
]
