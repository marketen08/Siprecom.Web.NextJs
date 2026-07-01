import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Modulo } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

export function useGetModulosSelect() {
  return useQuery({
    queryKey: ["modulos", "select"],
    queryFn: () => apiClient.get<PagedResponse<Modulo>>("/api/modulos"),
  })
}
