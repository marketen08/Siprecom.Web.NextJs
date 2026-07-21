import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Pendiente } from "../types"

type TransicionAccion =
  | "iniciar"
  | "enviar-aprobacion"
  | "aprobar"
  | "rechazar"
  | "cancelar"

interface TransicionInput {
  id: string
  accion: TransicionAccion
  comentario?: string | null
}

/** Hook genérico para todas las transiciones de estado del pendiente. */
export function usePendienteTransicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accion, comentario }: TransicionInput) =>
      apiClient.post<ApiResponse<Pendiente>>(`/api/pendientes/${id}/${accion}`, {
        comentario: comentario ?? null,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pendientes"] })
      qc.invalidateQueries({ queryKey: ["pendientes", vars.id] })
      // Los pines del visor de PID cachean el estado del pendiente para
      // pintar su color — refrescamos para que cambie en el acto.
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
    },
  })
}

interface AsignarInput {
  id: string
  responsableId: string
}

export function useAsignarResponsable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, responsableId }: AsignarInput) =>
      apiClient.put<ApiResponse<Pendiente>>(`/api/pendientes/${id}/responsable`, {
        responsableId,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pendientes"] })
      qc.invalidateQueries({ queryKey: ["pendientes", vars.id] })
      // Los pines del visor de PID cachean el estado del pendiente para
      // pintar su color — refrescamos para que cambie en el acto.
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
    },
  })
}
