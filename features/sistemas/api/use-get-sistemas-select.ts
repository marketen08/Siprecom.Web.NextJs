import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Sistema } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

export function useGetSistemasSelect() {
  return useQuery({
    queryKey: ["sistemas", "select"],
    queryFn: () => apiClient.get<PagedResponse<Sistema>>("/api/sistemas"),
  })
}
