import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { invalidarPostCargaRegistro } from "./invalidar-post-carga"
import type { FirmarRegistroInput } from "../types"

export function useFirmarRegistro(registroId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: FirmarRegistroInput) =>
      apiClient.post(`/api/registros/${registroId}/firmar`, data),
    onSuccess: () => {
      // Firmar puede cerrar el registro y cambiar el estado de la tarea
      // (COMPLETADO → FIRMADO). Usamos el helper compartido para no dejar keys
      // stale — cubre listado de tareas, sheet, avance, testgroups, mis-firmas, etc.
      queryClient.invalidateQueries({ queryKey: ["registros", registroId, "firmas"] })
      invalidarPostCargaRegistro(queryClient, registroId)
    },
  })
}
