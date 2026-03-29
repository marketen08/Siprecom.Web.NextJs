"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, FolderOpen } from "lucide-react"
import Link from "next/link"

import type { Usuario } from "@/features/usuarios/types"
import { useOpenUsuario } from "@/features/usuarios/hooks/use-open-usuario"

import { Button } from "@/components/ui/button"

function RowActions({ usuario }: { usuario: Usuario }) {
  const { open } = useOpenUsuario()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Gestionar proyectos"
        asChild
      >
        <Link href={`/configuracion/usuarios/${usuario.id}/proyectos`}>
          <FolderOpen className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Editar usuario"
        onClick={() => open(usuario.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  )
}

export const columns: ColumnDef<Usuario>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => {
      const { nombre, apellido } = row.original
      const fullName = [nombre, apellido].filter(Boolean).join(" ")
      return (
        <span className="font-medium">{fullName || "—"}</span>
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
    accessorKey: "userName",
    header: "Usuario",
    cell: ({ row }) => (
      <span className="text-sm font-mono text-muted-foreground">{row.original.userName}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions usuario={row.original} />,
  },
]
