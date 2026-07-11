import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { FirmasConfigEfectiva } from "@/features/registros/api/use-get-firmas-config-efectiva"

interface Response {
  data: FirmasConfigEfectiva
  message: string
}

/**
 * Config efectiva de firmas resuelta directamente por ElementoTarea (proyecto o
 * override de tarea). Se usa desde la pantalla /checklist/{planillaId}/{etId} —
 * la que se abre al escanear el QR del papel — para decidir si activar la
 * detección visual de firma. A diferencia del endpoint análogo por registro,
 * no requiere que exista uno todavía.
 */
export function useGetFirmasConfigEfectivaPorEt(elementoTareaId: string | null) {
  return useQuery({
    queryKey: ["elementos-tareas", elementoTareaId, "firmas-config-efectiva"],
    queryFn: () =>
      apiClient.get<Response>(
        `/api/elementos-tareas/${elementoTareaId}/firmas-config-efectiva`,
      ),
    enabled: !!elementoTareaId,
    staleTime: 60_000,
  })
}
