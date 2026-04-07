import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useResetPasswordAdmin(usuarioId: string) {
  return useMutation({
    mutationFn: (newPassword: string) =>
      apiClient.put(`/api/usuarios/${usuarioId}/password`, { newPassword }),
  })
}
