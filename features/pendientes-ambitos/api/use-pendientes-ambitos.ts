import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PendienteAmbito, PendienteAmbitoSet } from "../types"

const QK_CATALOGO = ["pendientes-ambitos"] as const
const QK_MIOS = ["pendientes-ambitos", "mios"] as const

/** Catálogo completo — pantalla de configuración (AdminGlobal). */
export function useGetPendientesAmbitos() {
  return useQuery({
    queryKey: QK_CATALOGO,
    queryFn: () => apiClient.get<ApiResponse<PendienteAmbito[]>>("/api/pendientes-ambitos"),
    staleTime: 1000 * 60,
  })
}

/**
 * Ámbitos donde el usuario puede clasificar. Se usa en el alta y en la
 * reclasificación, y cambia poco: cachea largo para no pedirlo en cada apertura
 * del formulario.
 */
export function useGetMisAmbitos() {
  return useQuery({
    queryKey: QK_MIOS,
    queryFn: () => apiClient.get<ApiResponse<PendienteAmbito[]>>("/api/pendientes-ambitos/mios"),
    staleTime: 1000 * 60 * 5,
  })
}

function useInvalidar() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: QK_CATALOGO })
    // La audiencia cambia qué ámbitos puede usar cada uno: el selector del
    // formulario tiene que enterarse.
    qc.invalidateQueries({ queryKey: QK_MIOS })
  }
}

export function useCrearAmbito() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (payload: PendienteAmbitoSet) =>
      apiClient.post<ApiResponse<PendienteAmbito>>("/api/pendientes-ambitos", payload),
    onSuccess: invalidar,
  })
}

export function useActualizarAmbito() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PendienteAmbitoSet }) =>
      apiClient.put<ApiResponse<PendienteAmbito>>(`/api/pendientes-ambitos/${id}`, payload),
    onSuccess: invalidar,
  })
}

export function useEliminarAmbito() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiResponse<boolean>>(`/api/pendientes-ambitos/${id}`),
    onSuccess: invalidar,
  })
}
