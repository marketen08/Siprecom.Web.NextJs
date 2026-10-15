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
  /** Método de ingreso: 0 = mail+contraseña, 1 = Microsoft (SSO), 2 = YPF (IBM Verify). */
  loginMethod?: number
  /** Roles asignados al usuario. Viene en los listados. */
  roles?: string[]
  /**
   * Equipos de administración a los que pertenece. Viene en los listados.
   * Array vacío = ninguno, y para un Admin eso significa que no puede crear
   * planillas hasta que un AdminGlobal le asigne uno.
   */
  equipos?: string[]
}

export interface UsuarioUpdateInput {
  nombre?: string
  apellido?: string
  proyectoId?: string
  terminalId?: string
}
