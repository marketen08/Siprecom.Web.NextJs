import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/**
 * GET /planillas/disponibles?proyectoId=... — aplica el filtro estricto de
 * grupos habilitados del proyecto (+ comodín "sin grupo"). Consumido por el
 * select de planilla en el tarea-form.
 *
 * Ver PlanillaService.GetPlanillasDisponiblesAsync en el backend.
 */
export function useGetPlanillasDisponibles(proyectoId: string | null | undefined) {
  return useQuery({
    queryKey: ["planillas", "disponibles", proyectoId],
    queryFn: () => apiClient.get(`/api/planillas/disponibles?proyectoId=${proyectoId}`),
    enabled: !!proyectoId,
    staleTime: 1000 * 60,
  })
}
