import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useIniciarTarea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (elementoTareaId: string) =>
      apiClient.post(`/api/elementos-tareas/${elementoTareaId}/iniciar`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elementos-tareas"] })
      queryClient.invalidateQueries({ queryKey: ["avance"] })
    },
  })
}
