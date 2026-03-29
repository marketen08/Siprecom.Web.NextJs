import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useAddProyectoUsuario(usuarioId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.post(`/api/usuarios/${usuarioId}/proyectos`, { proyectoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuario-proyectos", usuarioId] })
    },
  })
}
