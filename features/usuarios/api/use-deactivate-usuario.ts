import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeactivateUsuario(usuarioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.delete(`/api/usuarios/${usuarioId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      queryClient.invalidateQueries({ queryKey: ["usuario", usuarioId] })
    },
  })
}
