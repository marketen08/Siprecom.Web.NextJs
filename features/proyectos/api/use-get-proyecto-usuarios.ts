import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface ProyectoUsuario {
  id: string
  usuarioId: string
  userName: string
  email: string
  nombre: string
  apellido: string
  esActivo: boolean
}

export function useGetProyectoUsuarios(proyectoId: string | null) {
  return useQuery({
    queryKey: ["proyecto-usuarios", proyectoId],
    queryFn: () => apiClient.get<ProyectoUsuario[]>(`/api/proyectos/${proyectoId}/usuarios`),
    enabled: !!proyectoId,
  })
}
