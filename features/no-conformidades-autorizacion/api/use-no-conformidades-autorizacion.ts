import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  NoConformidadAccionGrupo,
  NoConformidadAutorizacionSet,
} from "../types"

const QK = (proyectoId: string) =>
  ["proyectos", proyectoId, "no-conformidades-autorizacion"] as const

export function useGetNcAutorizacion(proyectoId: string | null) {
  return useQuery({
    queryKey: proyectoId ? QK(proyectoId) : ["disabled"],
    queryFn: () =>
      apiClient.get<ApiResponse<NoConformidadAccionGrupo[]>>(
        `/api/proyectos/${proyectoId}/no-conformidades-autorizacion`,
      ),
    enabled: !!proyectoId,
    staleTime: 1000 * 60,
  })
}

export function useSetNcAutorizacion(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NoConformidadAutorizacionSet) =>
      apiClient.put<ApiResponse<NoConformidadAccionGrupo[]>>(
        `/api/proyectos/${proyectoId}/no-conformidades-autorizacion`,
        payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(proyectoId) }),
  })
}
