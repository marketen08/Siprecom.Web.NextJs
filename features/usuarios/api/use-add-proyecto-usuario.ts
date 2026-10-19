import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { refrescarSiEsMiUsuario } from "@/lib/refrescar-por-cambio-de-proyecto"

export function useAddProyectoUsuario(usuarioId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.post(`/api/usuarios/${usuarioId}/proyectos`, { proyectoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuario-proyectos", usuarioId] })
      // Si el usuario no tenía proyecto activo, el backend pone este. Ver el helper.
      refrescarSiEsMiUsuario(queryClient, usuarioId)
    },
  })
}
