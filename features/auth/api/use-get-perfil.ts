import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface PerfilUsuario {
  id: string
  email: string
  userName: string
  nombre: string
  apellido: string
  profileImageUrl: string
  proyectoId: string
  /** Nombre del proyecto activo — poblado en GetProfile del backend. */
  proyectoNombre?: string | null
  clienteId: string
  /** Nombre de la empresa (cliente o contratista) — poblado en GetProfile. */
  clienteNombre?: string | null
  sociedadId: string
  terminalId: string
  color: string
  /** 0 = mail+contraseña, 1 = Microsoft (SSO). Default 0 si el backend no lo manda. */
  loginMethod?: number
  /** Roles asignados al usuario (AspNetUserRoles). */
  roles?: string[]
  /** True si el usuario está dado de baja. */
  isLocked?: boolean
}

export function useGetPerfil() {
  return useQuery({
    queryKey: ["perfil"],
    queryFn: () => apiClient.get<PerfilUsuario>("/api/auth/perfil"),
    staleTime: 1000 * 60 * 5,
  })
}
