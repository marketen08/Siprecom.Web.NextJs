import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface CreateUsuarioInput {
  email: string
  /** 0 = Mail+contraseña (invitación), 1 = Microsoft. */
  loginMethod: number
  nombre?: string
  apellido?: string
  proyectoId?: string
  /** Empresa (cliente o contratista) a la que pertenece. Obligatorio. */
  clienteId: string
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
