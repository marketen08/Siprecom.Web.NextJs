import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export interface NcAreaOpcion {
  id: string
  nombre: string
  descripcion?: string | null
}

export interface NcAreas {
  /** Grupos que pueden ser área AFECTADA: los que el proyecto autorizó a ejecutar. */
  afectada: NcAreaOpcion[]
  /** Grupos que pueden ser área de SEGUIMIENTO: los autorizados a controlar. */
  seguimiento: NcAreaOpcion[]
  /** La que el proyecto propone por defecto, si definió una. */
  seguimientoPorDefectoId: string | null
}

/**
 * Las dos listas del alta de una No Conformidad.
 *
 * Antes los dos selects mostraban la misma lista —todos los grupos marcados para
 * Calidad— y se podía abrir un informe cuya área afectada no podía cargar su propia
 * investigación. Ahora cada lista sale de la matriz de autorización del proyecto, que
 * es la misma fuente que usa el backend para validar: la pantalla no puede ofrecer
 * algo que el alta vaya a rechazar.
 *
 * Depende del proyecto activo (el backend lo toma de la sesión), así que no lleva
 * staleTime largo: la matriz se edita desde la configuración del proyecto y el alta
 * tiene que ver el cambio sin esperar.
 */
export function useGetNcAreas(enabled = true) {
  return useQuery({
    queryKey: ["no-conformidades", "areas"],
    enabled,
    // Sin caché: esto depende de una configuración que el propio usuario está
    // editando en otra pantalla. Con el staleTime global de 5 minutos, quien
    // terminaba de armar la matriz y volvía al alta seguía viendo la lista de
    // antes —típicamente vacía, porque a mitad de la configuración la
    // intersección no da— y la conclusión era "lo configuré y no aparece".
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: () => apiClient.get<ApiResponse<NcAreas>>("/api/no-conformidades/areas"),
  })
}
