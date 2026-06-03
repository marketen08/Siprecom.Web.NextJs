import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  EntidadFiltro,
  ProyectoIfcEntidad,
  ProyectoIfcEntidadesPage,
} from "../types"

const QK_PAGE = (archivoId: string | null, filtro: EntidadFiltro, busqueda: string, page: number) =>
  ["ifc", archivoId, "entidades", filtro, busqueda, page] as const

const QK_ARCHIVO = (proyectoId: string | null) =>
  ["proyectos", proyectoId, "ifc"] as const

export function useGetIfcEntidades(
  proyectoId: string,
  archivoId: string | null,
  filtro: EntidadFiltro,
  busqueda: string,
  page: number,
  pageSize = 50,
) {
  return useQuery({
    queryKey: QK_PAGE(archivoId, filtro, busqueda, page),
    enabled: !!archivoId,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (filtro !== "todas") params.set("filtro", filtro)
      if (busqueda.trim()) params.set("busqueda", busqueda.trim())
      return apiClient.get<ApiResponse<ProyectoIfcEntidadesPage>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades?${params.toString()}`,
      )
    },
  })
}

export function useVincularIfcEntidad(proyectoId: string, archivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entidadId, elementoId }: { entidadId: string; elementoId: string }) =>
      apiClient.put<ApiResponse<ProyectoIfcEntidad>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades/${entidadId}/vincular`,
        { elementoId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ifc", archivoId, "entidades"] })
      qc.invalidateQueries({ queryKey: QK_ARCHIVO(proyectoId) })
    },
  })
}

export function useDesvincularIfcEntidad(proyectoId: string, archivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entidadId: string) =>
      apiClient.delete<ApiResponse<ProyectoIfcEntidad>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades/${entidadId}/vincular`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ifc", archivoId, "entidades"] })
      qc.invalidateQueries({ queryKey: QK_ARCHIVO(proyectoId) })
    },
  })
}

export function useProcesarIfcArchivo(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivoId: string) =>
      apiClient.post<ApiResponse<unknown>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/procesar`,
        {},
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_ARCHIVO(proyectoId) }),
  })
}

/**
 * Resuelve un set de IfcGuid → datos del Elemento vinculado.
 * Lo usa el viewer cuando el usuario clickea en una entidad 3D.
 */
export async function resolverEntidadesPorGuids(
  proyectoId: string,
  archivoId: string,
  ifcGuids: string[],
): Promise<ProyectoIfcEntidad[]> {
  if (ifcGuids.length === 0) return []
  const resp = await apiClient.post<ApiResponse<ProyectoIfcEntidad[]>>(
    `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades/resolver`,
    { ifcGuids },
  )
  return resp?.data ?? []
}
