import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CamposParaLimpiar, LimpiezaCamposResultado } from "../types"

/**
 * Preview de la limpieza del catálogo: qué campos no usa ninguna planilla activa.
 *
 * `enabled` para no pedirlo hasta que se abre el diálogo — recorre el catálogo entero
 * contando valores cargados, así que no es una query para tener colgada de la página.
 */
export function useGetCamposSinUso(enabled: boolean) {
  return useQuery({
    queryKey: ["campos", "sin-uso"],
    queryFn: () => apiClient.get<{ data: CamposParaLimpiar }>("/api/campos/sin-uso"),
    enabled,
    staleTime: 0,
  })
}

export function useEliminarCamposSinUso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (campoIds: string[]) =>
      apiClient.post<{ data: LimpiezaCamposResultado; message: string }>(
        "/api/campos/eliminar-sin-uso",
        { campoIds },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campos"] })
    },
  })
}
