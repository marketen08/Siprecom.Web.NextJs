import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Cliente } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetCliente(id: string | null) {
  return useQuery({
    queryKey: ["clientes", id],
    queryFn: () => apiClient.get<ApiResponse<Cliente>>(`/api/clientes/${id}`),
    enabled: !!id,
  })
}
