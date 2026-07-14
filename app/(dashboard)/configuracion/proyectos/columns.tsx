"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Proyecto } from "@/features/proyectos/types"
import { ESTADO_PROYECTO } from "@/features/proyectos/types"
import { useOpenProyecto } from "@/features/proyectos/hooks/use-open-proyecto"
import { useDeleteProyecto } from "@/features/proyectos/api/use-delete-proyecto"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

const ESTADO_COLORS: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-green-100 text-green-700",
  5: "bg-red-100 text-red-700",
  6: "bg-orange-100 text-orange-700",
  7: "bg-slate-100 text-slate-600",
}

/** Badge de estado del proyecto. Reutilizado por la tabla (desktop) y las cards (mobile). */
export function EstadoBadge({ estado }: { estado: number }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ESTADO_COLORS[estado] ?? ""}`}
    >
      {ESTADO_PROYECTO[estado as keyof typeof ESTADO_PROYECTO] ?? estado}
    </span>
  )
}

export function RowActions({ proyecto }: { proyecto: Proyecto }) {
  const { open } = useOpenProyecto()
  const deleteMutation = useDeleteProyecto()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(proyecto.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar proyecto?"
        description={
          <>
            Esta acción eliminará <strong>{proyecto.nombre}</strong>. Podés reactivarlo después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(proyecto.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<Proyecto>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <Link
        href={`/configuracion/proyectos/${row.original.id}`}
        className="font-medium text-blue-700 hover:underline"
      >
        {row.original.nombre}
      </Link>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
  },
  {
    accessorKey: "clienteNombre",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.clienteNombre ?? "—"}</span>
    ),
  },
  {
    accessorKey: "contratistaNombre",
    header: "Contratista",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.contratistaNombre ?? "—"}</span>
    ),
  },
  {
    accessorKey: "observaciones",
    header: "Observaciones",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
        {row.original.observaciones}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions proyecto={row.original} />,
  },
]
