"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { BookText, Pencil, Trash2 } from "lucide-react"

import type { SubSistema } from "@/features/subsistemas/types"
import { useOpenSubSistema } from "@/features/subsistemas/hooks/use-open-subsistema"
import { useDeleteSubSistema } from "@/features/subsistemas/api/use-delete-subsistema"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function RowActions({ subsistema }: { subsistema: SubSistema }) {
  const { open } = useOpenSubSistema()
  const deleteMutation = useDeleteSubSistema()

  // Atajo al generador de databook con el subsistema pre-cargado. Llevamos
  // también el sistemaId para que el filtro del form quede coherente y
  // la lista de subsistemas no recargue desde cero.
  const databookHref = `/reporte/databook?subSistemaId=${encodeURIComponent(subsistema.id)}&sistemaId=${encodeURIComponent(subsistema.sistemaId)}`

  return (
    <div className="flex items-center gap-1 justify-end">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-700 hover:text-blue-900 hover:bg-blue-50"
          >
            <Link href={databookHref}>
              <BookText className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Generar Databook de este SubSistema</TooltipContent>
      </Tooltip>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(subsistema.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar subsistema?"
        description={
          <>
            Esta acción eliminará <strong>{subsistema.nombre}</strong>. Podés reactivarlo después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(subsistema.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<SubSistema>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.original.codigo}</span>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nombre}</span>
    ),
  },
  // Las fechas planificadas ahora viven en SubSistemaNivel (planificación por nivel).
  // Se editan desde el sheet del subsistema. Acá omitimos columnas de fecha para no inducir confusión.
  {
    accessorKey: "createdByNombre",
    header: "Creado por",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.createdByNombre}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions subsistema={row.original} />,
  },
]
