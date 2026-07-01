import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

// Espejo del enum EstadoElementoTarea del backend.
export const ESTADO_TAREA = {
  PENDIENTE: 1,
  EN_PROCESO: 2,
  COMPLETADO: 3,
  APROBADO: 4,
  RECHAZADO: 5,
  CANCELADO: 6,
  FIRMADO: 7,
} as const

export type EstadoTarea = (typeof ESTADO_TAREA)[keyof typeof ESTADO_TAREA]

export const ESTADO_TAREA_LABEL: Record<number, string> = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  4: "Aprobado",
  5: "Rechazado",
  6: "Cancelado",
  7: "Firmado",
}

export interface TestGroupTareaItem {
  id: string
  testGroupId: string
  tareaId: string
  tareaCodigo: number
  tareaNombre: string
  tareaElementoTipoNombre: string | null
  estado: EstadoTarea
  estadoTexto: string
  fechaPlanificada: string | null
  fechaInicio: string | null
  fechaFinalizacion: string | null
  porcentajeAvance: number
  motivoRechazo: string | null
  observaciones: string | null
}

export function useGetTareasPack(testGroupId: string | null) {
  return useQuery({
    queryKey: ["testgroups", testGroupId, "tareas"],
    queryFn: () =>
      apiClient.get<ApiResponse<TestGroupTareaItem[]>>(`/api/testgroups/${testGroupId}/tareas`),
    enabled: !!testGroupId,
  })
}
