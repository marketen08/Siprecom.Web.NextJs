import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      apiClient.put("/api/auth/perfil/password", data),
  })
}
