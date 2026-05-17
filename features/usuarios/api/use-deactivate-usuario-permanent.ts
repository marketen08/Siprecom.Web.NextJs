import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/**
 * Baja DEFINITIVA: bloquea login + anonimiza email/UserName para que el email
 * quede libre para reutilizar. La identidad histórica (Nombre/Apellido) se
 * preserva para trazabilidad de firmas y registros.
 */
export function useDeactivateUsuarioPermanent(usuarioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.delete(`/api/usuarios/${usuarioId}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      queryClient.invalidateQueries({ queryKey: ["usuario", usuarioId] })
    },
  })
}
