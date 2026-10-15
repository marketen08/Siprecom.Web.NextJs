import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/**
 * Genera (on-demand) el link para que el usuario defina/cambie su contraseña, para
 * compartirlo manualmente cuando el email no llega. Solo aplica a usuarios de mail+contraseña.
 */
export function useGetPasswordLink(usuarioId: string) {
  return useMutation({
    mutationFn: () => apiClient.get<{ url: string }>(`/api/usuarios/${usuarioId}/password-link`),
  })
}
