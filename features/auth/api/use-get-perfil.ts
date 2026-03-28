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
  clienteId: string
  sociedadId: string
  terminalId: string
  color: string
}

export function useGetPerfil() {
  return useQuery({
    queryKey: ["perfil"],
    queryFn: () => apiClient.get<PerfilUsuario>("/api/auth/perfil"),
    staleTime: 1000 * 60 * 5,
  })
}
