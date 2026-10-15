import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface FirmasConfigEfectiva {
  cantidadSlotsFisica: number
  cantidadSlotsDigital: number
  hayFirmasFisicas: boolean
  /** Flag global RECHAZAR_IMAGEN_BAJA_RESOLUCION. Si true + hayFirmasFisicas, el
   *  uploader bloquea la subida cuando el ancho de la imagen es menor a `anchoMinimoImagen`. */
  rechazarBajaResolucion: boolean
  /** Ancho mínimo (px) para imágenes cuando el rechazo está activo. Default 1500. */
  anchoMinimoImagen: number
}

interface Response {
  data: FirmasConfigEfectiva
  message: string
}

/**
 * Cantidad de slots (Fisica y Digital) que se van a materializar cuando este
 * registro se apruebe/complete. El frontend lo usa para decidir si activa la
 * detección visual de firma en el escaneo antes de subir el PDF físico.
 */
export function useGetFirmasConfigEfectiva(registroId: string | null) {
  return useQuery({
    queryKey: ["registros", registroId, "firmas-config-efectiva"],
    queryFn: () =>
      apiClient.get<Response>(`/api/registros/${registroId}/firmas-config-efectiva`),
    enabled: !!registroId,
    staleTime: 60_000,
  })
}
