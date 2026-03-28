"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Elemento } from "@/features/elementos/types"
import { useOpenElemento } from "@/features/elementos/hooks/use-open-elemento"
import { useDeleteElemento } from "@/features/elementos/api/use-delete-elemento"

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

const PRIORIDAD_COLOR: Record<number, string> = {
  1: "text-green-600",
  2: "text-blue-600",
  3: "text-orange-500",
  4: "text-red-600",
}

function RowActions({ elemento }: { elemento: Elemento }) {
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

      <AlertDialog>
        <AlertDialogTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors">
          <Trash2 className="h-4 w-4" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>{elemento.tag} — {elemento.nombre}</strong>. Podés reactivarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(elemento.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    accessorKey: "prioridadTexto",
    header: "Prioridad",
    cell: ({ row }) => (
      <span className={`text-sm font-medium ${PRIORIDAD_COLOR[row.original.prioridad] ?? ""}`}>
        {row.original.prioridadTexto}
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
    cell: ({ row }) => <RowActions elemento={row.original} />,
  },
]
