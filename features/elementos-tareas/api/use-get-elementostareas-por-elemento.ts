import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTarea } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

export function useGetElementosTareasPorElemento(elementoId: string | null) {
  return useQuery({
    queryKey: ["elementos-tareas", "por-elemento", elementoId],
    queryFn: () =>
      apiClient.post<PagedResponse<ElementoTarea>>("/api/elementos-tareas/search", {
        filter: { elementoId },
        page: 1,
        pageSize: 200,
      }),
    enabled: !!elementoId,
  })
}
