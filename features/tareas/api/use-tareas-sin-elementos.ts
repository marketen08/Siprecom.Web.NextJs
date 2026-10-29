import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export interface TareaSinElementosItem {
  id: string
  codigo: number
  nombre: string
  nivelNombre: string | null
  planillaCodigo: string | null
}

export interface TareasSinElementosGrupo {
  elementoTipoId: string
  elementoTipoNombre: string | null
  especialidadNombre: string | null
  tareas: TareaSinElementosItem[]
}

export interface TareaSinElementosExcluida {
  id: string
  codigo: number
  nombre: string
  motivo: string
}

export interface TareasSinElementosPreview {
  totalTareasProyecto: number
  tareasABorrar: number
  elementosActivos: number
  tiposConElementos: number
  ultimoElementoCargado: string | null
  sePuedeAplicar: boolean
  motivoNoAplicable: string | null
  grupos: TareasSinElementosGrupo[]
  excluidas: TareaSinElementosExcluida[]
}

export interface LimpiezaResultado {
  eliminadas: number
  excluidas: number
  eliminadasIds: string[]
}

/**
 * Tareas del proyecto cuyo tipo de elemento no está en el alcance: ningún generador las va
 * a instanciar, porque el match es por ElementoTipoId.
 *
 * Son las que deja la copia de configuración al crear un proyecto — ahí todavía no hay
 * elementos, así que se copia el catálogo completo del origen.
 *
 * `enabled` para no pedirlo hasta abrir el panel: es una consulta que recorre el catálogo
 * y los elementos del proyecto, no hace falta en cada render del listado.
 */
export function useGetTareasSinElementos(enabled: boolean) {
  return useQuery({
    queryKey: ["tareas-sin-elementos"],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<TareasSinElementosPreview>>(
        "/api/tareas/sin-elementos",
      )
      return resp?.data ?? null
    },
    enabled,
    // Sin cache: entre que se abre el panel y se confirma pueden haber entrado elementos,
    // y el backend recalcula igual antes de aplicar.
    staleTime: 0,
  })
}

export function useLimpiarTareasSinElementos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const resp = await apiClient.post<ApiResponse<LimpiezaResultado>>(
        "/api/tareas/sin-elementos/limpiar",
        {},
      )
      return resp?.data ?? null
    },
    onSuccess: () => {
      // El catálogo de tareas cambió, y con él los conteos de uso de planillas: una
      // planilla puede quedar liberada para darse de baja.
      queryClient.invalidateQueries({ queryKey: ["tareas"] })
      queryClient.invalidateQueries({ queryKey: ["tareas-select"] })
      queryClient.invalidateQueries({ queryKey: ["tareas-sin-elementos"] })
      queryClient.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
