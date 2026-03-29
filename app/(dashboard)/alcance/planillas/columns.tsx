"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Settings, Trash2 } from "lucide-react"
import Link from "next/link"

import type { Planilla } from "@/features/planillas/types"
import { useOpenPlanilla } from "@/features/planillas/hooks/use-open-planilla"
import { useDeletePlanilla } from "@/features/planillas/api/use-delete-planilla"

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

function RowActions({ planilla }: { planilla: Planilla }) {
  const { open } = useOpenPlanilla()
  const deleteMutation = useDeletePlanilla()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Editar datos"
        onClick={() => open(planilla.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Diseñar planilla"
        asChild
      >
        <Link href={`/alcance/planillas/${planilla.id}`}>
          <Settings className="h-4 w-4" />
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors">
          <Trash2 className="h-4 w-4" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>{planilla.nombre}</strong>. Podés reactivarla después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(planilla.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export const columns: ColumnDef<Planilla>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nombre}</span>
    ),
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {row.original.descripcion || "—"}
      </span>
    ),
  },
  {
    accessorKey: "createdByNombre",
    header: "Creado por",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.createdByNombre || "—"}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions planilla={row.original} />,
  },
]
