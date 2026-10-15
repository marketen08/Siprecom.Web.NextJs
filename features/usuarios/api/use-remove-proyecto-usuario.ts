import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

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
    },
  })
}
