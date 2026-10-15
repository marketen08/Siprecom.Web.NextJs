import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface ApropiarCampoResultado {
  campoId: string
  codigo: string
  /** True si hubo que renombrar el código porque el equipo ya tenía uno igual. */
  codigoRenombrado: boolean
  equipoId: string
  equipoNombre?: string
  /** Cuántas otras planillas se quedaron con el campo original. */
  otrasPlanillasQueSiguenConElOriginal: number
}

interface Respuesta {
  message?: string
  data?: ApropiarCampoResultado
}

/**
 * Clona el campo global (o de otro equipo) al equipo del usuario y re-apunta SÓLO esta
 * planilla. Las demás planillas que usaban el campo quedan intactas.
 *
 * Es la salida al "este campo es global y no lo podés editar". Se invoca explícitamente
 * desde un diálogo y no al fallar una escritura: el usuario tiene que saber que ahora
 * tiene una copia y no el campo de la casa.
 */
export function useApropiarCampo(planillaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planillaCampoId: string) =>
      apiClient.post<Respuesta>(`/api/planillas/${planillaId}/campos/${planillaCampoId}/apropiar`, {}),
    onSuccess: () => {
      // La estructura cambió de CampoId, así que hay que recargarla. Y el catálogo tiene
      // un campo más, que aparece en la pantalla de Campos y en el modal de alta.
      qc.invalidateQueries({ queryKey: ["planillas", planillaId, "estructura"] })
      qc.invalidateQueries({ queryKey: ["campos"] })
    },
  })
}
