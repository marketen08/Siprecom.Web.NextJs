import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Tarea } from "../types"
import type { ApiResponse, PagedResponse } from "@/features/proyectos/types"

/** Trae todas las tareas del proyecto en una sola página (catálogo para selects). */
export function useGetTareasSelect() {
  return useQuery({
    queryKey: ["tareas-select"],
    queryFn: () =>
      apiClient.get<PagedResponse<Tarea>>("/api/tareas", { page: 1, pageSize: 1000 }),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Nombres distintos de Tareas que TIENEN al menos una ElementoTarea activa en el
 * proyecto — para selects contextuales como el filtro de /coordinacion/tareas
 * (evita mostrar tareas del catálogo que no están asignadas a nadie).
 */
export function useGetTareasUsadasSelect() {
  return useQuery<string[]>({
    queryKey: ["tareas-usadas"],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<string[]>>(
        "/api/elementostareas/tareas-usadas",
      )
      return resp?.data ?? []
    },
    staleTime: 1000 * 60,
  })
}
