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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(proyectoId) })
      // La matriz decide qué grupos se ofrecen como área al abrir un informe, así
      // que guardar acá cambia lo que muestra el alta: sin esto, quien configura y
      // va derecho a cargar una NC sigue viendo las listas de antes.
      qc.invalidateQueries({ queryKey: ["no-conformidades", "areas"] })
    },
  })
}
