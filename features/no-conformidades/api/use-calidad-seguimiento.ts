import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

/**
 * Define el área de seguimiento que el alta de un informe de calidad propone por
 * defecto en este proyecto. `null` la quita.
 *
 * Es sólo el valor inicial del formulario —el informe puede abrirse con otra área—,
 * así que no hace falta confirmar ni avisar nada: lo que evita es la decisión repetida
 * en una obra donde el área que controla es siempre la misma.
 */
export function useAsignarCalidadSeguimiento(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (grupoId: string | null) =>
      apiClient.patch<ApiResponse<boolean>>(
        `/api/proyectos/${proyectoId}/calidad-seguimiento`,
        { grupoId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] })
      // El alta lee el default junto con las listas de áreas.
      qc.invalidateQueries({ queryKey: ["no-conformidades", "areas"] })
    },
  })
}
