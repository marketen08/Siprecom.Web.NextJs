import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { refrescarSiEsMiUsuario } from "@/lib/refrescar-por-cambio-de-proyecto"

export function useSetProyectoActivoAdmin(usuarioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.put(`/api/usuarios/${usuarioId}/proyecto`, { proyectoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuario-proyectos", usuarioId] })
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })

      // Si el usuario que se está editando es uno mismo, esto acaba de cambiar MI
      // proyecto activo: el resto de la app está mirando los datos del anterior. Es el
      // mismo problema que el switcher del navbar, así que el mismo refresco.
      refrescarSiEsMiUsuario(queryClient, usuarioId)
    },
  })
}
