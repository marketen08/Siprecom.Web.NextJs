import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteElemento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/elementos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elementos"] })
      // Al borrar se desvinculan las entidades del modelo 3D — refrescamos el visor.
      queryClient.invalidateQueries({ queryKey: ["ifc"] })
    },
  })
}
