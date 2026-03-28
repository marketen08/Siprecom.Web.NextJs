import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Sistema } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetSistema(id: string | null) {
  return useQuery({
    queryKey: ["sistemas", id],
    queryFn: () => apiClient.get<ApiResponse<Sistema>>(`/api/sistemas/${id}`),
    enabled: !!id,
  })
}
