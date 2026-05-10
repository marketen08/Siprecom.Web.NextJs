import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { RegistroVerificacion } from "../types"

interface VerificacionResponse {
  data: RegistroVerificacion
}

export function useGetVerificacion(registroId: string | null) {
  return useQuery({
    queryKey: ["registros", registroId, "verificacion"],
    queryFn: () => apiClient.get<VerificacionResponse>(`/api/registros/${registroId}/verificacion`),
    enabled: !!registroId,
    staleTime: 1000 * 30, // 30s — el hash puede cambiar si llega otra firma
  })
}
