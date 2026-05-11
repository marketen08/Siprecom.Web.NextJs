import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceElementoDTO } from "../types"

interface Filters {
  sistemaId?: string
  subSistemaId?: string
  especialidad?: string
  elementoTipoId?: string
  prioridad?: number
  tareaId?: string
  /** Estado de ElementoTarea (1=Pendiente, 2=EnProceso, 3=Completado, 4=Aprobado, 5=Rechazado, 6=Cancelado, 7=Firmado). */
  estadoTarea?: number
}

/**
 * Lista de avance por elemento del proyecto del usuario, con filtros opcionales.
 * Sin filtros, devuelve todos los elementos del proyecto.
 */
export function useGetAvanceElementos(filters: Filters) {
  const {
    sistemaId, subSistemaId, especialidad, elementoTipoId,
    prioridad, tareaId, estadoTarea,
  } = filters
  return useQuery({
    queryKey: ["avance", "elementos", filters],
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceElementoDTO[]>>("/api/avance/elementos", {
        ...(sistemaId ? { sistemaId } : {}),
        ...(subSistemaId ? { subSistemaId } : {}),
        ...(especialidad ? { especialidad } : {}),
        ...(elementoTipoId ? { elementoTipoId } : {}),
        ...(prioridad !== undefined ? { prioridad } : {}),
        ...(tareaId ? { tareaId } : {}),
        ...(estadoTarea !== undefined ? { estadoTarea } : {}),
      }),
  })
}
