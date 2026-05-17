import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface UsuarioAdminUpdateInput {
  nombre?: string
  apellido?: string
}

export function useUpdateUsuarioAdmin(usuarioId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UsuarioAdminUpdateInput) =>
      apiClient.put(`/api/usuarios/${usuarioId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}
