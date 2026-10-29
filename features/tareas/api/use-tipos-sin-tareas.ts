import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export interface TipoSinTareas {
  elementoTipoId: string
  elementoTipoNombre: string | null
  especialidadNombre: string | null
  /** Tipo portador de las tareas de un test pack: se muestra aparte. */
  esSintetico: boolean
  /** Elementos activos de este tipo en el proyecto. Para un sintético, paquetes. */
  elementos: number
  /** De esos, cuántos no tienen ni una tarea asignada. */
  elementosSinNingunaTarea: number
}

export interface TiposSinTareasPreview {
  elementosActivos: number
  tiposPresentes: number
  /** Sólo los físicos; los sintéticos van en su propio contador. */
  tiposSinTareas: number
  elementosAfectados: number
  tiposSinteticosSinTareas: number
  tipos: TipoSinTareas[]
}

/**
 * Tipos de elemento que están en la obra y no tienen ninguna tarea en el catálogo del
 * proyecto. Es la contracara de `useGetTareasSinElementos`: ahí sobran tareas de tipos que no
 * están en la obra, acá faltan tareas para tipos que sí están.
 *
 * `enabled` para no pedirlo hasta abrir el panel: recorre los elementos del proyecto y no
 * hace falta en cada render del listado.
 */
export function useGetTiposSinTareas(enabled: boolean) {
  return useQuery({
    queryKey: ["tipos-sin-tareas"],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<TiposSinTareasPreview>>(
        "/api/tareas/tipos-sin-tareas",
      )
      return resp?.data ?? null
    },
    enabled,
    // Sin cache: se abre justo después de importar elementos o tareas, y lo que importa es
    // el estado de ahora.
    staleTime: 0,
  })
}
