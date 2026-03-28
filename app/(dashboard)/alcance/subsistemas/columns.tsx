"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { SubSistema } from "@/features/subsistemas/types"
import { useOpenSubSistema } from "@/features/subsistemas/hooks/use-open-subsistema"
import { useDeleteSubSistema } from "@/features/subsistemas/api/use-delete-subsistema"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function RowActions({ subsistema }: { subsistema: SubSistema }) {
  const { open } = useOpenSubSistema()
  const deleteMutation = useDeleteSubSistema()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(subsistema.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors">
          <Trash2 className="h-4 w-4" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar subsistema?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>{subsistema.nombre}</strong>. Podés reactivarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(subsistema.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  {
    accessorKey: "fechaInicio",
    header: "Inicio",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.fechaInicio.substring(0, 10)}
      </span>
    ),
  },
  {
    accessorKey: "fechaFin",
    header: "Fin",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.fechaFin.substring(0, 10)}
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
    cell: ({ row }) => <RowActions subsistema={row.original} />,
  },
]
