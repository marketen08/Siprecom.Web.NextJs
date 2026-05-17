import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useReactivateUsuario(usuarioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.put(`/api/usuarios/${usuarioId}/reactivar`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      queryClient.invalidateQueries({ queryKey: ["usuario", usuarioId] })
    },
  })
}
