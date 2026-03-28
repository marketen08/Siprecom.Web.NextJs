import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface ProyectoOpcion {
  id: string
  nombre: string
  estado: number
  esActivo: boolean
}

export function useGetMisProyectos() {
  return useQuery({
    queryKey: ["mis-proyectos"],
    queryFn: () => apiClient.get<ProyectoOpcion[]>("/api/auth/mis-proyectos"),
    staleTime: 1000 * 60 * 5,
  })
}
