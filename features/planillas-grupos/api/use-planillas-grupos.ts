import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PlanillaGrupo, PlanillaGrupoDetalle, PlanillaGrupoInput } from "../types"

const QK = ["planillas-grupos"] as const

/** Trae todos los grupos activos (para selects y listados). */
export function useGetPlanillasGrupos() {
  return useQuery({
    queryKey: QK,
    queryFn: () => apiClient.get<ApiResponse<PlanillaGrupo[]>>("/api/planillas-grupos"),
    staleTime: 1000 * 60 * 5,
  })
}

/** Detalle del grupo con las planillas asignadas. */
export function useGetPlanillaGrupo(id: string | null) {
  return useQuery({
    queryKey: [...QK, id],
    queryFn: () => apiClient.get<ApiResponse<PlanillaGrupoDetalle>>(`/api/planillas-grupos/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60,
  })
}

export function useCreatePlanillaGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PlanillaGrupoInput) =>
      apiClient.post<ApiResponse<PlanillaGrupo>>("/api/planillas-grupos", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      // El listado de planillas también muestra los grupos → invalidar.
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

export function useUpdatePlanillaGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: PlanillaGrupoInput & { id: string }) =>
      apiClient.put<ApiResponse<PlanillaGrupo>>(`/api/planillas-grupos/${id}`, { id, ...data }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: [...QK, vars.id] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

export function useDeletePlanillaGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/planillas-grupos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

/** Asigna una o más planillas al grupo (idempotente). Devuelve el detalle. */
export function useAsignarPlanillasAGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ grupoId, planillaIds }: { grupoId: string; planillaIds: string[] }) =>
      apiClient.post<ApiResponse<PlanillaGrupoDetalle>>(
        `/api/planillas-grupos/${grupoId}/planillas`,
        { planillaIds },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: [...QK, vars.grupoId] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

/** Quita una planilla del grupo (idempotente). Devuelve el detalle. */
export function useQuitarPlanillaDeGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ grupoId, planillaId }: { grupoId: string; planillaId: string }) =>
      apiClient.delete<ApiResponse<PlanillaGrupoDetalle>>(
        `/api/planillas-grupos/${grupoId}/planillas/${planillaId}`,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: [...QK, vars.grupoId] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
