import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, RegistroFirmasStatus } from "../types"

export function useGetFirmasStatus(registroId: string | null | undefined) {
  return useQuery({
    queryKey: ["registros", registroId, "firmas"],
    queryFn: () => apiClient.get<ApiResponse<RegistroFirmasStatus>>(`/api/registros/${registroId}/firmas`),
    enabled: !!registroId,
  })
}
