import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, Proyecto } from "../types"

export function useGetProyecto(id: string | null) {
  return useQuery({
    queryKey: ["proyectos", id],
    queryFn: () => apiClient.get<ApiResponse<Proyecto>>(`/api/proyectos/${id}`),
    enabled: !!id,
  })
}
