import type { PagedResponse } from "@/features/proyectos/types"

export type { PagedResponse }

export interface Usuario {
  id: string
  email: string
  userName: string
  nombre?: string
  apellido?: string
  profileImageUrl?: string
  proyectoId?: string
  clienteId?: string
  /** Nombre de la empresa (cliente o contratista). Viene en los listados. */
  clienteNombre?: string
  sociedadId?: string
  terminalId?: string
  color?: string
  /** Roles asignados al usuario. Viene en los listados. */
  roles?: string[]
}

export interface UsuarioUpdateInput {
  nombre?: string
  apellido?: string
  proyectoId?: string
  terminalId?: string
}
