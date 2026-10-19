import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { refrescarSiEsMiUsuario } from "@/lib/refrescar-por-cambio-de-proyecto"

/**
 * Quita el acceso de un usuario a un proyecto.
 *
 * Si era su proyecto activo, el backend lo deja en null. Antes rechazaba la baja
 * con "cambialo primero (★)", lo que dejaba sin salida al usuario de un solo
 * proyecto: no se lo podía dar de baja sin asignarle otro antes.
 */
export function useRemoveProyectoUsuario(usuarioId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.delete(`/api/usuarios/${usuarioId}/proyectos/${proyectoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuario-proyectos", usuarioId] })
      queryClient.invalidateQueries({ queryKey: ["usuarios", usuarioId] })
      queryClient.invalidateQueries({ queryKey: ["mis-proyectos"] })
      // Si el usuario soy yo y era mi proyecto activo, me quedé sin proyecto: todo lo
      // que esté cacheado de él pasó a ser de un proyecto que ya no miro.
      refrescarSiEsMiUsuario(queryClient, usuarioId)
    },
  })
}
