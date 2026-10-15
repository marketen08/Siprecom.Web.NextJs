import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

/** Payload que devuelve el endpoint POST /elementostareas/sync. */
export interface SincronizarResultado {
  etCreadas: number
  etCanceladas: number
  elementosProcesados: number
  tareasProcesadas: number
  errores: string[]
}

/**
 * Reconciliación masiva: crea las ElementoTarea faltantes para todos los
 * Elementos y Tareas activos del proyecto según la relación Elemento →
 * ElementoTipo → Tarea. Idempotente — solo crea; nunca modifica ni borra.
 * Uso típico: reparar propagaciones perdidas por bugs o imports previos.
 */
export function useSincronizarElementosTareas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<ApiResponse<SincronizarResultado>>(
        "/api/elementostareas/sync",
        {},
      ),
    onSuccess: () => {
      // Invalidamos listados de tareas para que refleje las ET creadas.
      qc.invalidateQueries({ queryKey: ["tareas"] })
      qc.invalidateQueries({ queryKey: ["elementos"] })
      qc.invalidateQueries({ queryKey: ["elementostareas"] })
    },
  })
}
