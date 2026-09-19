import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Pendiente } from "../types"

/**
 * Reclasificación: mueve el pendiente a otro ámbito.
 *
 * Endpoint propio y no parte del update, por el mismo motivo que la reasignación:
 * cambia quién ve el pendiente —junto con sus comentarios y adjuntos— y el backend
 * lo autoriza aparte (mandar sobre el ámbito origen + pertenecer al destino).
 */
export function useReclasificarPendiente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ambitoId, comentario }: { id: string; ambitoId: string; comentario?: string }) =>
      apiClient.put<ApiResponse<Pendiente>>(`/api/pendientes/${id}/ambito`, {
        ambitoId,
        comentario: comentario?.trim() || null,
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["pendiente", id] })
      // El listado también: el pendiente puede haber salido de la vista del
      // usuario, o haber cambiado de marca.
      qc.invalidateQueries({ queryKey: ["pendientes"] })
    },
  })
}
