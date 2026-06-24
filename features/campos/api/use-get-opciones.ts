import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoOpcion } from "@/features/planillas/types"
import type { PagedResponse } from "@/features/proyectos/types"

/** Trae las opciones (CampoOpcion) de un campo Lista, para el editor global del campo. */
export function useGetOpciones(campoId: string | undefined) {
  return useQuery({
    queryKey: ["campos", campoId, "opciones"],
    queryFn: () => apiClient.get<PagedResponse<CampoOpcion>>(`/api/campos/${campoId}/opciones`),
    enabled: !!campoId,
  })
}
