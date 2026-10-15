import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export interface DescripcionCatalogoItem {
  id: string
  texto: string
  vecesUsada: number
}

/**
 * Sugerencias de descripciones del catálogo del proyecto. El combobox del form
 * de pendiente las usa para inducir a los operadores a reusar descripciones
 * idénticas (facilita reporting / agrupación).
 *
 * `q` filtra por match parcial. Vacío = trae las más usadas (top N).
 * `enabled=false` desactiva el fetch (por ejemplo cuando el popover está cerrado).
 */
export function useDescripcionesSugeridas(q: string, opts?: { enabled?: boolean; limit?: number }) {
  const enabled = opts?.enabled ?? true
  const limit = opts?.limit ?? 20
  return useQuery({
    queryKey: ["pendientes-descripciones", { q, limit }],
    enabled,
    // Cache corta — el catálogo crece con cada creación, no queremos servir
    // sugerencias muy viejas.
    staleTime: 30_000,
    queryFn: () =>
      apiClient.get<ApiResponse<DescripcionCatalogoItem[]>>(
        "/api/pendientes-descripciones",
        { q, limit },
      ),
  })
}
