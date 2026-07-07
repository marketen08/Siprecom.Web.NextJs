import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface BulkResponse {
  message: string
  creados?: number
  reactivados?: number
  desasignados?: number
  omitidosSinAcceso?: number
  omitidosNoExisten?: number
}

/**
 * Asigna varios proyectos a un usuario en un solo round-trip. El backend filtra
 * silenciosamente los proyectos a los que el admin invocante no tiene acceso
 * (los reporta en `omitidosSinAcceso`). NO cambia el proyecto activo del user.
 */
export function useBulkAssignProyectosUsuario(usuarioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (proyectoIds: string[]) =>
      apiClient.post<BulkResponse>(`/api/usuarios/${usuarioId}/proyectos/bulk`, { proyectoIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuario-proyectos", usuarioId] })
    },
  })
}

/** Desasigna varios proyectos en batch. */
export function useBulkUnassignProyectosUsuario(usuarioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (proyectoIds: string[]) =>
      apiClient.post<BulkResponse>(`/api/usuarios/${usuarioId}/proyectos/bulk-remove`, { proyectoIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuario-proyectos", usuarioId] })
    },
  })
}
