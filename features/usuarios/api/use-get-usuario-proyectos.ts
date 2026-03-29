import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface UsuarioProyecto {
  id: string
  proyectoId: string
  proyectoNombre: string
  esActivo: boolean
}

export function useGetUsuarioProyectos(usuarioId: string | null) {
  return useQuery({
    queryKey: ["usuario-proyectos", usuarioId],
    queryFn: () => apiClient.get<UsuarioProyecto[]>(`/api/usuarios/${usuarioId}/proyectos`),
    enabled: !!usuarioId,
  })
}
