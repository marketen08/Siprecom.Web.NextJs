import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useSetUsuarioRol(usuarioId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rol: string) =>
      apiClient.put(`/api/usuarios/${usuarioId}/rol`, { rol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios", usuarioId, "rol"] })
    },
  })
}
