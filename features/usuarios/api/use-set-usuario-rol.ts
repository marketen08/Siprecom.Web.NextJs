import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useSetUsuarioRol(usuarioId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rol: string) =>
      apiClient.put(`/api/usuarios/${usuarioId}/rol`, { rol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios", usuarioId, "rol"] })
      // También el usuario en sí: su `roles` alimenta el aviso de "no pertenece a
      // ningún equipo de administradores", que sólo aplica a Admin sin bypass. Sin
      // esta invalidación el aviso recién aparecía al recargar la página, justo
      // cuando acabás de crear la condición que lo dispara.
      queryClient.invalidateQueries({ queryKey: ["usuarios", usuarioId] })
    },
  })
}
