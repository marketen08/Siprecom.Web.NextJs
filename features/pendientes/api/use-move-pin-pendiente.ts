import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Pendiente } from "../types"

export interface MoverPinInput {
  pendienteId: string
  pidPagina: number
  pidCoordX: number
  pidCoordY: number
}

/**
 * Mueve el pin de un pendiente sobre el mismo PID. El id se pasa por request
 * (no como argumento del hook) para que el visor pueda mover N pines distintos
 * con una única instancia de la mutation.
 *
 * Autorización backend: creador del pendiente o Admin/Supervisor.
 */
export function useMovePinPendiente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pendienteId, pidPagina, pidCoordX, pidCoordY }: MoverPinInput) =>
      apiClient.patch<ApiResponse<Pendiente>>(
        `/api/pendientes/${pendienteId}/pid-coord`,
        { pidPagina, pidCoordX, pidCoordY },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendientes"] })
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
    },
  })
}
