import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { HitosPorNivelDTO } from "../types"

/** Hitos del proyecto agrupados por Nivel → Tarea, del proyecto activo del usuario. */
export function useGetHitosTareas() {
  return useQuery({
    queryKey: ["avance", "hitos-tareas"],
    queryFn: () => apiClient.get<ApiResponse<HitosPorNivelDTO[]>>("/api/avance/hitos-tareas"),
  })
}
