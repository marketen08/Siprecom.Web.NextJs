import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceDTO } from "../types"

/** Avance resumen de todos los proyectos accesibles para el usuario. */
export function useGetAvanceProyectos() {
  return useQuery({
    queryKey: ["avance", "proyectos"],
    queryFn: () => apiClient.get<ApiResponse<AvanceDTO[]>>("/api/avance/proyectos"),
  })
}
