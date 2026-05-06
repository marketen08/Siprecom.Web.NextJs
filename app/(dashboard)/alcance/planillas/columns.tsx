"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Copy, Pencil, Settings, Trash2 } from "lucide-react"
import Link from "next/link"

import type { Planilla } from "@/features/planillas/types"
import { useOpenPlanilla } from "@/features/planillas/hooks/use-open-planilla"
import { useDeletePlanilla } from "@/features/planillas/api/use-delete-planilla"
import { useClonePlanilla } from "@/features/planillas/api/use-clone-planilla"

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
  const cloneMutation = useClonePlanilla()

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
        <AlertDialogTrigger
          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
          title="Clonar"
          disabled={cloneMutation.isPending}
        >
          <Copy className="h-4 w-4" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Clonar planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una copia de <strong>{planilla.nombre}</strong> con todas sus secciones y campos. La nueva planilla tendrá el sufijo "(copia)" en el nombre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => cloneMutation.mutate(planilla.id)}>
              Clonar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function formatFecha(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
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
      <span className="block text-sm text-muted-foreground line-clamp-2 max-w-sm whitespace-normal wrap-break-word">
        {row.original.descripcion || "—"}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Última actualización",
    cell: ({ row }) => (
      <div className="text-sm leading-tight">
        <div>{formatFecha(row.original.updatedAt)}</div>
        {row.original.updatedByNombre && (
          <div className="text-xs text-muted-foreground">por {row.original.updatedByNombre}</div>
        )}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions planilla={row.original} />,
  },
]
