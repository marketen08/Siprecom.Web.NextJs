import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetUsuarioRol(usuarioId: string | null) {
  return useQuery({
    queryKey: ["usuarios", usuarioId, "rol"],
    queryFn: () => apiClient.get<{ roles: string[] }>(`/api/usuarios/${usuarioId}/rol`),
    enabled: !!usuarioId,
  })
}
