import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export type TransicionTestGroup = "activar" | "volver-a-borrador" | "cerrar" | "recalcular-estado"

/**
 * Mutation genérica para las 4 transiciones de estado (Fase 4).
 * Invalida caches del listado y del detalle del pack.
 */
export function useTransicionTestGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; accion: TransicionTestGroup }) =>
      apiClient.post(`/api/testgroups/${payload.id}/${payload.accion}`, {}),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["testgroups"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.id] })
    },
  })
}
