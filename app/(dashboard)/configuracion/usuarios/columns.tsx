"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

import type { Usuario } from "@/features/usuarios/types"
import { meetsRole } from "@/lib/roles"

/**
 * Método de ingreso, abreviado para la columna. Los textos largos están en
 * `MetodoLoginSelector` (new-usuario-sheet), que es la referencia: acá se usa la
 * versión corta y el nombre completo va en el `title`.
 */
export const LOGIN_METHOD: Record<number, { corto: string; largo: string; clase: string }> = {
  0: { corto: "Mail",      largo: "Mail + contraseña",  clase: "bg-gray-100 text-gray-700" },
  1: { corto: "Microsoft", largo: "Microsoft (SSO)",    clase: "bg-blue-50 text-blue-700" },
  2: { corto: "YPF",       largo: "YPF (IBM Verify)",   clase: "bg-violet-50 text-violet-700" },
}

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

// La columna de acciones con el ícono de rueda se eliminó: su único ítem llevaba a
// la misma ficha que el click en la fila, así que era un segundo camino al mismo
// lugar ocupando una columna. La fila completa es clickeable (ver page.tsx), igual
// que las cards de mobile, que ya funcionaban así.

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
    accessorKey: "loginMethod",
    header: "Ingreso",
    cell: ({ row }) => {
      // Default 0 si el backend no lo manda, igual que el resto de los consumidores.
      const m = LOGIN_METHOD[row.original.loginMethod ?? 0]
      if (!m) return <span className="text-sm text-muted-foreground">—</span>
      return (
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${m.clase}`}
          title={m.largo}
        >
          {m.corto}
        </span>
      )
    },
  },
  {
    accessorKey: "equipos",
    header: "Equipo",
    cell: ({ row }) => <EquipoCelda usuario={row.original} />,
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
