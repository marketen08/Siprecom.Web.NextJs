import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { IntegridadRegistro, ApiResponse } from "../types"

/**
 * Verifica que el contenido del registro firmado no haya sido alterado.
 * El backend recalcula SHA-256 de cada firma incluyendo el digest de
 * RegistrosValores y lo compara con el hash persistido al momento de firmar.
 *
 * Acceso restringido a Admin/Supervisor en el backend.
 *
 * Cache 0 (siempre fresh) — el resultado depende del estado actual de la DB,
 * no del registro en sí. Si alguien alteró un valor entre dos verificaciones,
 * el segundo llamado debe reflejarlo.
 */
export function useVerificarIntegridad(registroId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["registros", registroId, "integridad"],
    queryFn: () =>
      apiClient.get<ApiResponse<IntegridadRegistro>>(
        `/api/registros/${registroId}/verificar-integridad`
      ),
    enabled: !!registroId && enabled,
    staleTime: 0,
  })
}
