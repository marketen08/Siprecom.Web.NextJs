import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PendienteComentario } from "../types"

interface Input {
  pendienteId: string
  comentario: string
}

export function useAgregarComentario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pendienteId, comentario }: Input) =>
      apiClient.post<ApiResponse<PendienteComentario>>(
        `/api/pendientes/${pendienteId}/comentarios`,
        { comentario },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pendientes", vars.pendienteId] })
    },
  })
}
