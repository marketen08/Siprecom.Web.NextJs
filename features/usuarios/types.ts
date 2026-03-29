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
  sociedadId?: string
  terminalId?: string
  color?: string
}

export interface UsuarioUpdateInput {
  nombre?: string
  apellido?: string
  proyectoId?: string
  terminalId?: string
}
