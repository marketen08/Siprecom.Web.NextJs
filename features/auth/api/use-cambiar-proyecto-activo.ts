import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useCambiarProyectoActivo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.patch("/api/auth/me/proyecto-activo", { proyectoId }),
    onSuccess: () => {
      // Invalida todo — todas las páginas refetchen con el nuevo proyecto activo
      queryClient.invalidateQueries()
    },
  })
}
