import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, ProyectoUsuarioRol } from "../types"

export function useGetUsuariosRoles(proyectoId: string | undefined) {
  return useQuery({
    queryKey: ["proyectos", proyectoId, "usuarios-roles"],
    queryFn: () =>
      apiClient.get<ApiResponse<ProyectoUsuarioRol[]>>(`/api/proyectos/${proyectoId}/usuarios-roles`),
    enabled: !!proyectoId,
  })
}
