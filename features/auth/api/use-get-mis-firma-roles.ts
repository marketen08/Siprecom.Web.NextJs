import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface FirmaRolPorProyecto {
  proyectoId: string
  proyectoNombre: string
  roles: string[]
}

export function useGetMisFirmaRoles() {
  return useQuery({
    queryKey: ["perfil", "firma-roles"],
    queryFn: () => apiClient.get<FirmaRolPorProyecto[]>("/api/auth/perfil/firma-roles"),
  })
}
