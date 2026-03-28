import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteProyecto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/proyectos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] })
    },
  })
}
