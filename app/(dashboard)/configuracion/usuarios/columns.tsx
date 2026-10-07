"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, Settings } from "lucide-react"
import Link from "next/link"

import type { Usuario } from "@/features/usuarios/types"
import { meetsRole } from "@/lib/roles"

import { Button } from "@/components/ui/button"

/**
 * True si a este usuario le FALTA algo por no tener equipo de administración.
 *
 * Es Admin+ pero sin bypass: un AdminGlobal o SuperAdmin trabaja sobre las planillas
 * globales, que es su default, así que no tener equipo es normal y no se advierte.
 * Un Admin sin equipo, en cambio, no puede crear ninguna planilla.
 */
export function necesitaEquipo(roles: string[] | undefined | null): boolean {
  return meetsRole(roles, "Admin") && !meetsRole(roles, "AdminGlobal")
}

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
    accessorKey: "equipos",
    header: "Equipo",
    cell: ({ row }) => <EquipoCelda usuario={row.original} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions usuario={row.original} />,
  },
]

/**
 * Equipos de administración del usuario.
 *
 * El caso que justifica la columna es el negativo: un Admin **sin** equipo no puede
 * crear ninguna planilla, y antes el síntoma aparecía recién cuando el propio Admin
 * intentaba crearla y recibía el error. Acá un AdminGlobal lo ve de un vistazo sobre
 * todo el padrón.
 *
 * Para quien no es Admin+ la ausencia de equipo no es un problema —no administra
 * catálogos— así que se muestra un guión neutro y no una advertencia.
 */
function EquipoCelda({ usuario }: { usuario: Usuario }) {
  const equipos = usuario.equipos ?? []
  if (equipos.length > 0) {
    return <span className="text-sm text-muted-foreground">{equipos.join(", ")}</span>
  }

  if (!necesitaEquipo(usuario.roles)) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"
      title="Sin equipo de administración no puede crear planillas"
    >
      <AlertTriangle className="h-3 w-3" />
      Sin equipo
    </span>
  )
}
