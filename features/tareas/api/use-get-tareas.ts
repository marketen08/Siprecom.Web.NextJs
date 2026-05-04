import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Tarea } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  elementoTipoId?: string
  nivelId?: string
}

export function useGetTareas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, elementoTipoId, nivelId } = params
  return useQuery({
    queryKey: ["tareas", { page, pageSize, nombre, elementoTipoId, nivelId }],
    queryFn: () =>
      apiClient.get<PagedResponse<Tarea>>("/api/tareas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(elementoTipoId ? { elementoTipoId } : {}),
        ...(nivelId ? { nivelId } : {}),
      }),
  })
}
