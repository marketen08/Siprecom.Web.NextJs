import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { invalidarPostCargaRegistro } from "./invalidar-post-carga"
import type { CompletarDigitalInput } from "../types"

export function useCompletarDigital(registroId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CompletarDigitalInput) =>
      apiClient.post(`/api/registros/${registroId}/completar/digital`, data),
    onSuccess: () => {
      // Usamos el helper compartido para invalidar todo lo que depende del
      // registro/tarea (incluye `["tareas-listado"]` para /ejecucion/tareas y
      // `["elemento-tarea"]` para el fetch puntual del menú lazy — sin esto
      // la pantalla /ejecucion/tareas sigue mostrando la tarea como pendiente
      // hasta que el user refresca con F5).
      invalidarPostCargaRegistro(queryClient, registroId)
    },
  })
}
