import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/** Cambia el método de ingreso del usuario. loginMethod: 0 = mail+contraseña, 1 = Microsoft. */
export function useCambiarLoginMethod(usuarioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (loginMethod: number) =>
      apiClient.put<{ message: string }>(`/api/usuarios/${usuarioId}/login-method`, { loginMethod }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios", usuarioId] })
      qc.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}
