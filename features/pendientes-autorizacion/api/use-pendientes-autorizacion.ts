import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  PendienteAccionGrupo,
  PendienteAutorizacionSet,
} from "../types"

const QK = (proyectoId: string, ambitoId: string) =>
  ["proyectos", proyectoId, "pendientes-autorizacion", ambitoId] as const

export function useGetPendientesAutorizacion(proyectoId: string | null, ambitoId: string | null) {
  return useQuery({
    queryKey: proyectoId && ambitoId ? QK(proyectoId, ambitoId) : ["disabled"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteAccionGrupo[]>>(
        `/api/proyectos/${proyectoId}/pendientes-autorizacion?ambitoId=${ambitoId}`,
      ),
    enabled: !!proyectoId && !!ambitoId,
    staleTime: 1000 * 60,
  })
}

export function useSetPendientesAutorizacion(proyectoId: string, ambitoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PendienteAutorizacionSet) =>
      apiClient.put<ApiResponse<PendienteAccionGrupo[]>>(
        `/api/proyectos/${proyectoId}/pendientes-autorizacion?ambitoId=${ambitoId}`,
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(proyectoId, ambitoId) }),
  })
}
