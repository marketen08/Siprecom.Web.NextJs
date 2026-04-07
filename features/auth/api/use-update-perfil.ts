import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface UpdatePerfilInput {
  nombre?: string
  apellido?: string
}

export function useUpdatePerfil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePerfilInput) =>
      apiClient.put("/api/auth/perfil", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfil"] })
    },
  })
}
