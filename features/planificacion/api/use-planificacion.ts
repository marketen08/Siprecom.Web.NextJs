import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  CapacidadBulkInput,
  CapacidadEspecialidad,
  EstimacionPlanificacion,
  GenerarPlanificacionInput,
  GenerarPlanificacionResult,
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

// El generador siempre se invoca explícitamente vía mutación. Se usa el MISMO endpoint
// para preview (dryRun=true) y apply (dryRun=false); la diferencia está en el body.
export function useGenerarPlanificacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerarPlanificacionInput) =>
      apiClient.post<ApiResponse<GenerarPlanificacionResult>>("/api/planificacion/generar", input),
    onSuccess: (resp) => {
      // Solo invalidamos cachés si efectivamente aplicamos (no en dry-run).
      if (resp?.data?.aplicado) {
        qc.invalidateQueries({ queryKey: QK_EST })
        qc.invalidateQueries({ queryKey: ["estadisticas"] })
        qc.invalidateQueries({ queryKey: ["avance"] })
      }
    },
  })
}

// Limpia las FechaPlanificada de todas las tareas Manual + futuras del proyecto activo.
// Después de esto el generador puede reasignarlas desde cero. Acción destructiva.
export function useLimpiarManualesFuturas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<ApiResponse<number>>("/api/planificacion/manuales-futuras/limpiar", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_EST })
      qc.invalidateQueries({ queryKey: ["estadisticas"] })
      qc.invalidateQueries({ queryKey: ["avance"] })
    },
  })
}
