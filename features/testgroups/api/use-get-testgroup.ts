import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { TestGroup } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetTestGroup(id: string | null) {
  return useQuery({
    queryKey: ["testgroups", id],
    queryFn: () => apiClient.get<ApiResponse<TestGroup>>(`/api/testgroups/${id}`),
    enabled: !!id,
  })
}
