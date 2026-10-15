import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceHitosFasesDTO } from "../types"

/** KPIs de hitos (RFC/RFSU/AOC) + fases por Nivel del proyecto activo. */
export function useGetAvanceHitosYFases() {
  return useQuery({
    queryKey: ["avance", "hitos-fases"],
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceHitosFasesDTO>>("/api/avance/hitos-fases"),
  })
}
