import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  PlanificacionVersionDetalle,
  PlanificacionVersionListItem,
  PlanificacionVersionUpdateInput,
} from "../types"

const QK_LISTA = ["planificacion", "versiones"] as const
const qkDetalle = (id: string) => ["planificacion", "versiones", id] as const

export function useGetVersiones() {
  return useQuery({
    queryKey: QK_LISTA,
    queryFn: () =>
      apiClient.get<ApiResponse<PlanificacionVersionListItem[]>>("/api/planificacion/versiones"),
    staleTime: 1000 * 60,
  })
}

export function useGetVersionDetalle(id: string | null) {
  return useQuery({
    queryKey: id ? qkDetalle(id) : ["planificacion", "versiones", "noop"],
    queryFn: () =>
      apiClient.get<ApiResponse<PlanificacionVersionDetalle>>(`/api/planificacion/versiones/${id}`),
    enabled: !!id,
  })
}

export function useUpdateVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: PlanificacionVersionUpdateInput & { id: string }) =>
      apiClient.patch<ApiResponse<PlanificacionVersionListItem>>(
        `/api/planificacion/versiones/${id}`,
        data,
      ),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK_LISTA })
      qc.invalidateQueries({ queryKey: qkDetalle(id) })
    },
  })
}

export function useDeleteVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiResponse<boolean>>(`/api/planificacion/versiones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_LISTA }),
  })
}

export function useCrearBaseline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<ApiResponse<PlanificacionVersionListItem>>(
        "/api/planificacion/versiones/baseline",
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_LISTA })
      // Invalidamos también la timeline porque la curva P0 ahora aparece.
      qc.invalidateQueries({ queryKey: ["estadisticas", "avance", "timeline"] })
    },
  })
}
