import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PreservacionCicloListItem } from "../types"

interface Response {
  data: PreservacionCicloListItem[]
  message: string
}

/**
 * Cadena completa de ciclos de preservación de un elemento — ya ordenada por
 * tarea (Codigo) y ciclo. El componente Timeline agrupa por tareaId.
 */
export function useGetTimelinePreservacionElemento(elementoId: string | null) {
  return useQuery({
    queryKey: ["preservacion", "timeline", elementoId],
    queryFn: () =>
      apiClient.get<Response>(`/api/preservacion/elementos/${elementoId}/timeline`),
    enabled: !!elementoId,
  })
}
