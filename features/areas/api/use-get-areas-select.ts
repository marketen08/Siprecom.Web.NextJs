import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Area } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

export function useGetAreasSelect() {
  return useQuery({
    queryKey: ["areas", "select"],
    queryFn: () => apiClient.get<PagedResponse<Area>>("/api/areas"),
  })
}
