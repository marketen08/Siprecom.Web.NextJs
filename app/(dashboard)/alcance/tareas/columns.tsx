"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Tarea } from "@/features/tareas/types"
import { PRIORIDAD, PRIORIDAD_COLOR } from "@/features/tareas/types"
import { useOpenTarea } from "@/features/tareas/hooks/use-open-tarea"
import { useDeleteTarea } from "@/features/tareas/api/use-delete-tarea"

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

function RowActions({ tarea }: { tarea: Tarea }) {
  const { open } = useOpenTarea()
  const deleteMutation = useDeleteTarea()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(tarea.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors">
          <Trash2 className="h-4 w-4" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>{tarea.nombre}</strong>. Podés reactivarla después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(tarea.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export const columns: ColumnDef<Tarea>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{row.original.codigo}</span>
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
    accessorKey: "prioridad",
    header: "Prioridad",
    cell: ({ row }) => {
      const p = row.original.prioridad
      return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORIDAD_COLOR[p] ?? ""}`}>
          {PRIORIDAD[p] ?? row.original.prioridadTexto ?? "—"}
        </span>
      )
    },
  },
  {
    accessorKey: "elementoTipoNombre",
    header: "Tipo de elemento",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.elementoTipoNombre || "—"}</span>
    ),
  },
  {
    accessorKey: "nivelNombre",
    header: "Nivel",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.nivelNombre || "—"}</span>
    ),
  },
  {
    accessorKey: "planillaNombre",
    header: "Planilla",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.planillaNombre || "—"}</span>
    ),
  },
  {
    accessorKey: "horasBase",
    header: "Horas base",
    cell: ({ row }) => (
      <span className="text-sm text-right tabular-nums">{row.original.horasBase}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions tarea={row.original} />,
  },
]
