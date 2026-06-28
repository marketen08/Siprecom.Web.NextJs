"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Settings } from "lucide-react"
import Link from "next/link"

import type { Usuario } from "@/features/usuarios/types"

import { Button } from "@/components/ui/button"

function RowActions({ usuario }: { usuario: Usuario }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Administrar usuario"
        asChild
      >
        <Link href={`/configuracion/usuarios/${usuario.id}`}>
          <Settings className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

export const columns: ColumnDef<Usuario>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => {
      const { id, nombre, apellido } = row.original
      const fullName = [nombre, apellido].filter(Boolean).join(" ")
      return (
        <Link href={`/configuracion/usuarios/${id}`} className="font-medium hover:underline">
          {fullName || "—"}
        </Link>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "clienteNombre",
    header: "Empresa",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.clienteNombre || "—"}</span>
    ),
  },
  {
    accessorKey: "roles",
    header: "Rol",
    cell: ({ row }) => {
      const roles = row.original.roles ?? []
      return (
        <span className="text-sm text-muted-foreground">
          {roles.length > 0 ? roles.join(", ") : "—"}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions usuario={row.original} />,
  },
]
