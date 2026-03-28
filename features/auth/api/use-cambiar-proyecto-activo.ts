import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useCambiarProyectoActivo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.patch("/api/auth/me/proyecto-activo", { proyectoId }),
    onSuccess: () => {
      // Refetch inmediato de todas las queries activas con el nuevo proyecto activo
      queryClient.refetchQueries({ type: "active" })
    },
  })
}
