import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Tarea } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

/** Trae todas las tareas del proyecto en una sola página (catálogo para selects). */
export function useGetTareasSelect() {
  return useQuery({
    queryKey: ["tareas-select"],
    queryFn: () =>
      apiClient.get<PagedResponse<Tarea>>("/api/tareas", { page: 1, pageSize: 1000 }),
    staleTime: 1000 * 60 * 5,
  })
}
