import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { TimelineDTO } from "../types"

export function useGetAvanceTimeline() {
  return useQuery({
    queryKey: ["estadisticas", "avance", "timeline"],
    queryFn: () =>
      apiClient.get<ApiResponse<TimelineDTO>>("/api/estadisticas/avance/timeline"),
  })
}
