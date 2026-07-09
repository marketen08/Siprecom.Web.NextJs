import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  PendienteAccionGrupo,
  PendienteAutorizacionSet,
} from "../types"

const QK = (proyectoId: string) => ["proyectos", proyectoId, "pendientes-autorizacion"] as const

export function useGetPendientesAutorizacion(proyectoId: string | null) {
  return useQuery({
    queryKey: proyectoId ? QK(proyectoId) : ["disabled"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteAccionGrupo[]>>(
        `/api/proyectos/${proyectoId}/pendientes-autorizacion`,
      ),
    enabled: !!proyectoId,
    staleTime: 1000 * 60,
  })
}

export function useSetPendientesAutorizacion(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PendienteAutorizacionSet) =>
      apiClient.put<ApiResponse<PendienteAccionGrupo[]>>(
        `/api/proyectos/${proyectoId}/pendientes-autorizacion`,
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(proyectoId) }),
  })
}
