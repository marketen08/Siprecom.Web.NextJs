"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { ElementoTipo } from "@/features/elementostipos/types"
import { useOpenElementoTipo } from "@/features/elementostipos/hooks/use-open-elementotipo"
import { useDeleteElementoTipo } from "@/features/elementostipos/api/use-delete-elementotipo"

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

      <AlertDialog>
        <AlertDialogTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors">
          <Trash2 className="h-4 w-4" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>{tipo.nombre}</strong>. Podés reactivarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(tipo.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    accessorKey: "especialidad",
    header: "Especialidad",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.especialidad || "—"}</span>
    ),
  },
  {
    accessorKey: "horasBaseDefault",
    header: "Hs. base",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.horasBaseDefault}</span>
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
    accessorKey: "createdByNombre",
    header: "Creado por",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.createdByNombre}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions tipo={row.original} />,
  },
]
