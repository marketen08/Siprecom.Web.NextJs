"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Download, FileText, Pencil, Trash2 } from "lucide-react"

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
    accessorKey: "nombreArchivo",
    header: "Archivo",
    cell: ({ row }) => {
      const p = row.original
      if (!p.nombreArchivo) {
        return <span className="text-sm text-muted-foreground">—</span>
      }
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <FileText className="h-3.5 w-3.5 text-gray-500 shrink-0" />
          <span className="text-gray-800 truncate max-w-[18rem]" title={p.nombreArchivo}>
            {p.nombreArchivo}
          </span>
          {p.archivoUrl && (
            <a
              href={p.archivoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
              title="Descargar"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )
    },
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
