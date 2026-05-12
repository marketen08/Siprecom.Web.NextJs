import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse } from "@/features/proyectos/types"
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
  /** Búsqueda libre sobre TAG y Nombre (filtra en backend). */
  search?: string
  page?: number
  pageSize?: number
}

/**
 * Lista paginada de avance por elemento del proyecto del usuario. Backend devuelve
 * { data, total, page, pageSize }. Default pageSize=20.
 */
export function useGetAvanceElementos(filters: Filters) {
  const {
    sistemaId, subSistemaId, especialidad, elementoTipoId,
    prioridad, tareaId, estadoTarea, search,
    page = 1, pageSize = 20,
  } = filters
  return useQuery({
    queryKey: ["avance", "elementos", filters],
    queryFn: () =>
      apiClient.get<PagedResponse<AvanceElementoDTO>>("/api/avance/elementos", {
        page,
        pageSize,
        ...(sistemaId ? { sistemaId } : {}),
        ...(subSistemaId ? { subSistemaId } : {}),
        ...(especialidad ? { especialidad } : {}),
        ...(elementoTipoId ? { elementoTipoId } : {}),
        ...(prioridad !== undefined ? { prioridad } : {}),
        ...(tareaId ? { tareaId } : {}),
        ...(estadoTarea !== undefined ? { estadoTarea } : {}),
        ...(search ? { search } : {}),
      }),
  })
}
