import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse, Usuario } from "../types"

export function useGetUsuario(id: string | null) {
  return useQuery({
    queryKey: ["usuarios", id],
    queryFn: () =>
      apiClient.get<PagedResponse<Usuario>>("/api/usuarios", { id: id!, pageSize: 1 }),
    enabled: !!id,
  })
}
