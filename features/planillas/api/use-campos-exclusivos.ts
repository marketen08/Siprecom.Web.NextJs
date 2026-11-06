import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CamposParaLimpiar } from "@/features/campos/types"

/**
 * Los campos que SÓLO usa esta planilla, o sea los que quedarían huérfanos en el
 * catálogo si se la elimina. Alimenta el checkbox del diálogo de borrado.
 *
 * `enabled` para pedirlo recién cuando el diálogo se abre: es una consulta por planilla
 * y no tiene sentido hacerla por cada fila del listado.
 */
export function useGetCamposExclusivos(planillaId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["planillas", planillaId, "campos-exclusivos"],
    queryFn: () =>
      apiClient.get<{ data: CamposParaLimpiar }>(
        `/api/planillas/${planillaId}/campos-exclusivos`,
      ),
    enabled: enabled && !!planillaId,
    staleTime: 0,
  })
}
