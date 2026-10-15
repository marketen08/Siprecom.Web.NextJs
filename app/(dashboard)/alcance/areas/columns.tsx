"use client"

import { ColumnDef } from "@tanstack/react-table"

import type { Area } from "@/features/areas/types"
import { AreaActionsMenu } from "@/features/areas/components/area-actions-menu"

export const columns: ColumnDef<Area>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.codigo}</span>,
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {row.original.descripcion ?? "—"}
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
    cell: ({ row }) => (
      <div className="flex justify-end">
        <AreaActionsMenu area={row.original} />
      </div>
    ),
  },
]
