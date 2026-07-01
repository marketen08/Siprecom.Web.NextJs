import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { EmitirCertificadoInput, SubsistemaCertificadoEstado } from "../types"

interface EstadoParams {
  sistemaId?: string
  subSistemaId?: string
}

export function useGetCertificadosEstado(params: EstadoParams = {}) {
  const { sistemaId, subSistemaId } = params
  return useQuery({
    queryKey: ["certificados", "estado", { sistemaId, subSistemaId }],
    queryFn: () =>
      apiClient.get<ApiResponse<SubsistemaCertificadoEstado[]>>(
        "/api/certificados/estado",
        {
          ...(sistemaId ? { sistemaId } : {}),
          ...(subSistemaId ? { subSistemaId } : {}),
        },
      ),
  })
}

export function useEmitirCertificado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EmitirCertificadoInput) => apiClient.post("/api/certificados/emitir", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificados"] })
      qc.invalidateQueries({ queryKey: ["testgroups"] })
    },
  })
}

export function useRevocarCertificado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      apiClient.post(`/api/certificados/${id}/revocar`, { motivoRevocacion: motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificados"] })
      qc.invalidateQueries({ queryKey: ["testgroups"] })
    },
  })
}
