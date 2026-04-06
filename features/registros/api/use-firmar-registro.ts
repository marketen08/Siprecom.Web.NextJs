import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { FirmarRegistroInput } from "../types"

export function useFirmarRegistro(registroId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: FirmarRegistroInput) =>
      apiClient.post(`/api/registros/${registroId}/firmar`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registros", registroId] })
      queryClient.invalidateQueries({ queryKey: ["registros", registroId, "firmas"] })
      queryClient.invalidateQueries({ queryKey: ["elementos-tareas"] })
      queryClient.invalidateQueries({ queryKey: ["avance"] })
    },
  })
}
