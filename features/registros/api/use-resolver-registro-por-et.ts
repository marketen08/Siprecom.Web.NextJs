import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface RegistroResolverResult {
  registroId: string
  elementoTareaId: string
  proyectoId: string
  elementoId: string
  elementoTag: string
  elementoNombre: string
  tareaId: string
  tareaNombre: string
  tareaCodigo: number
  planillaId: string
  planillaNombre: string
  /** true cuando el registro ya existía en BORRADOR (posible sobrescritura). */
  registroYaExistia: boolean
}

interface Response {
  data: RegistroResolverResult
  message: string
}

/**
 * Resuelve el Registro objetivo de un archivo de la Carga rápida por QR, a
 * partir del `elementoTareaId` decodificado. Si la ET está PENDIENTE, el
 * backend crea el Registro; si está EN_PROCESO reusa el BORRADOR existente.
 */
export function useResolverRegistroPorEt() {
  return useMutation({
    mutationFn: (elementoTareaId: string) =>
      apiClient.post<Response>(`/api/registros/resolver-por-elemento-tarea/${elementoTareaId}`, {}),
  })
}
