import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, PagedResponse } from "@/features/proyectos/types"
import type {
  PlanificacionFechaCambio,
  PlanificacionFechasBulkResult,
  PlanificacionTareaItem,
  PlanificacionTareasFiltros,
} from "../types"

const QK = ["planificacion", "manual", "tareas"] as const

export function useGetPlanificacionTareas(filtros: PlanificacionTareasFiltros) {
  const params: Record<string, string> = {}
  if (filtros.sistemaId)       params.sistemaId       = filtros.sistemaId
  if (filtros.subSistemaId)    params.subSistemaId    = filtros.subSistemaId
  if (filtros.nivelId)         params.nivelId         = filtros.nivelId
  if (filtros.especialidadId)  params.especialidadId  = filtros.especialidadId
  if (filtros.elementoTipoId)  params.elementoTipoId  = filtros.elementoTipoId
  if (filtros.estado != null)  params.estado          = String(filtros.estado)
  if (filtros.origen != null)  params.origen          = String(filtros.origen)
  if (filtros.sinFecha)        params.sinFecha        = "true"
  params.page     = String(filtros.page ?? 1)
  params.pageSize = String(filtros.pageSize ?? 20)

  return useQuery({
    queryKey: [...QK, params],
    queryFn: () =>
      apiClient.get<ApiResponse<PagedResponse<PlanificacionTareaItem>>>(
        "/api/planificacion/tareas",
        params,
      ),
  })
}

export function useActualizarFechasBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cambios: PlanificacionFechaCambio[]) =>
      apiClient.post<ApiResponse<PlanificacionFechasBulkResult>>(
        "/api/planificacion/tareas/fechas/bulk",
        { cambios },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ["planificacion", "estimacion"] })
      qc.invalidateQueries({ queryKey: ["estadisticas"] })
      qc.invalidateQueries({ queryKey: ["avance"] })
    },
  })
}
