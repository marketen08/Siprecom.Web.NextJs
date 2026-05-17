import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface CreateUsuarioInput {
  email: string
  password: string
  nombre?: string
  apellido?: string
  proyectoId?: string
}

export function useCreateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUsuarioInput) =>
      apiClient.post<{ userId: string }>("/api/usuarios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}
