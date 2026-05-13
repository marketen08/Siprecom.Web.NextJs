import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  CapacidadBulkInput,
  CapacidadEspecialidad,
  EstimacionPlanificacion,
} from "../types"

const QK_CAPS = ["planificacion", "capacidades"] as const
const QK_EST  = ["planificacion", "estimacion"] as const

export function useGetCapacidades() {
  return useQuery({
    queryKey: QK_CAPS,
    queryFn: () =>
      apiClient.get<ApiResponse<CapacidadEspecialidad[]>>("/api/planificacion/capacidades"),
    staleTime: 1000 * 60,
  })
}

export function useUpsertCapacidades() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CapacidadBulkInput) =>
      apiClient.put<ApiResponse<CapacidadEspecialidad[]>>("/api/planificacion/capacidades", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CAPS })
      // Si cambia la capacidad, la estimación queda stale.
      qc.invalidateQueries({ queryKey: QK_EST })
    },
  })
}

export function useGetEstimacion(fechaInicio: string | undefined) {
  return useQuery({
    queryKey: [...QK_EST, fechaInicio],
    queryFn: () =>
      apiClient.get<ApiResponse<EstimacionPlanificacion>>(
        "/api/planificacion/estimacion",
        fechaInicio ? { fechaInicio } : undefined,
      ),
  })
}
