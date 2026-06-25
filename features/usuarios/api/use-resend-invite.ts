import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/** Reenvía el email de alta (invitación para definir contraseña, o bienvenida Microsoft). */
export function useResendInvite(userId: string) {
  return useMutation({
    mutationFn: () => apiClient.post(`/api/auth/users/${userId}/resend-invite`, {}),
  })
}
