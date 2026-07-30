import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { ElementoTarea } from "../types"

/**
 * Fetch de una ElementoTarea puntual por id. Usado por menús lazy en listados —
 * las 50 filas de `/ejecucion/tareas` no cargan datos hasta que el user abre el
 * menú de acciones (query `enabled` por chunk).
 */
export function useGetElementoTarea(id: string | null, opts?: { enabled?: boolean }) {
  const enabled = (opts?.enabled ?? true) && !!id
  return useQuery<ApiResponse<ElementoTarea>, Error, ElementoTarea>({
    queryKey: ["elemento-tarea", id],
    queryFn: () => apiClient.get<ApiResponse<ElementoTarea>>(`/api/elementostareas/${id}`),
    select: (resp) => resp.data,
    enabled,
    staleTime: 30_000,
  })
}
