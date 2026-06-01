import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  ElementoPlanillaDisponible,
  ElementoValorPrecargado,
  ElementoValorPrecargadoUnificado,
  ElementoValorPrecargadoUnificadoUpsertInput,
  ElementoValorPrecargadoUpsertInput,
} from "../types"

interface PlanillasResponse {
  data: ElementoPlanillaDisponible[]
}

interface ValoresResponse {
  data: ElementoValorPrecargado[]
}

export function useGetElementoPlanillasDisponibles(elementoId: string | null) {
  return useQuery({
    queryKey: ["elementos", elementoId, "planillas-disponibles"],
    queryFn: () =>
      apiClient.get<PlanillasResponse>(`/api/elementos/${elementoId}/planillas-disponibles`),
    enabled: !!elementoId,
  })
}

export function useGetElementoValoresPrecargados(
  elementoId: string | null,
  planillaId: string | null,
) {
  return useQuery({
    queryKey: ["elementos", elementoId, "valores-precargados", planillaId],
    queryFn: () =>
      apiClient.get<ValoresResponse>(
        `/api/elementos/${elementoId}/valores-precargados/${planillaId}`,
      ),
    enabled: !!elementoId && !!planillaId,
  })
}

export function useUpsertElementoValoresPrecargados(elementoId: string, planillaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: ElementoValorPrecargadoUpsertInput[]) =>
      apiClient.put<ValoresResponse>(
        `/api/elementos/${elementoId}/valores-precargados/${planillaId}`,
        items,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["elementos", elementoId, "valores-precargados", planillaId],
      })
    },
  })
}

// ─── Valores precargados unificados (agrupados por campoId) ───────────────────

interface ValoresUnificadosResponse {
  data: ElementoValorPrecargadoUnificado[]
}

export function useGetElementoValoresPrecargadosUnificados(elementoId: string | null) {
  return useQuery({
    queryKey: ["elementos", elementoId, "valores-precargados-unificados"],
    queryFn: () =>
      apiClient.get<ValoresUnificadosResponse>(
        `/api/elementos/${elementoId}/valores-precargados-unificados`,
      ),
    enabled: !!elementoId,
  })
}

export function useUpsertElementoValoresPrecargadosUnificados(elementoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: ElementoValorPrecargadoUnificadoUpsertInput[]) =>
      apiClient.put<ValoresUnificadosResponse>(
        `/api/elementos/${elementoId}/valores-precargados-unificados`,
        items,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["elementos", elementoId, "valores-precargados-unificados"],
      })
    },
  })
}
