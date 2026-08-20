import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Tarea } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  elementoTipoId?: string
  especialidadId?: string
  nivelId?: string
  planillaId?: string
  prioridad?: number
  /** true = solo tareas puntuales (ad-hoc), false = solo las de la matriz, undefined = todas. */
  esAdHoc?: boolean
}

export function useGetTareas(params: Params = {}) {
  const {
    page = 1, pageSize = 10, nombre,
    elementoTipoId, especialidadId, nivelId, planillaId, prioridad, esAdHoc,
  } = params
  return useQuery({
    queryKey: [
      "tareas",
      { page, pageSize, nombre, elementoTipoId, especialidadId, nivelId, planillaId, prioridad, esAdHoc },
    ],
    queryFn: () =>
      apiClient.get<PagedResponse<Tarea>>("/api/tareas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(elementoTipoId ? { elementoTipoId } : {}),
        ...(especialidadId ? { especialidadId } : {}),
        ...(nivelId ? { nivelId } : {}),
        ...(planillaId ? { planillaId } : {}),
        ...(prioridad !== undefined ? { prioridad } : {}),
        ...(esAdHoc !== undefined ? { esAdHoc: String(esAdHoc) } : {}),
      }),
  })
}
