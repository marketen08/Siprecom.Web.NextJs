import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SubSistemaNivel, SubSistemaNivelUpsertInput } from "../types"

interface NivelesResponse {
  data: SubSistemaNivel[]
}

export function useGetSubSistemaNiveles(subSistemaId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["subsistemas", subSistemaId, "niveles"],
    queryFn: () => apiClient.get<NivelesResponse>(`/api/subsistemas/${subSistemaId}/niveles`),
    enabled: !!subSistemaId && enabled,
  })
}

export function useUpsertSubSistemaNiveles(subSistemaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: SubSistemaNivelUpsertInput[]) =>
      apiClient.put<NivelesResponse>(`/api/subsistemas/${subSistemaId}/niveles`, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subsistemas", subSistemaId, "niveles"] })
      // El fin estimado del proyecto puede haber cambiado.
      qc.invalidateQueries({ queryKey: ["proyectos"] })
    },
  })
}
