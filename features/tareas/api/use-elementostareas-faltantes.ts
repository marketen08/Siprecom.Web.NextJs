import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

/** Fila que devuelve el endpoint /elementostareas/faltantes. */
export interface ElementoTareaFaltante {
  elementoId: string
  elementoTag: string
  elementoCodigo: number
  sistemaId: string | null
  sistemaCodigo: string | null
  sistemaNombre: string | null
  subSistemaId: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  elementoTipoId: string | null
  elementoTipoNombre: string | null
  tareaId: string
  tareaCodigo: number
  tareaNombre: string
  tareaNivelNombre: string | null
}

interface FaltantesFilters {
  sistemaId?: string
  subSistemaId?: string
  elementoTipoId?: string
  tareaId?: string
}

export function useGetFaltantes(filters: FaltantesFilters = {}) {
  const params: Record<string, string> = {}
  if (filters.sistemaId) params.sistemaId = filters.sistemaId
  if (filters.subSistemaId) params.subSistemaId = filters.subSistemaId
  if (filters.elementoTipoId) params.elementoTipoId = filters.elementoTipoId
  if (filters.tareaId) params.tareaId = filters.tareaId

  return useQuery({
    queryKey: ["elementostareas", "faltantes", params],
    queryFn: () =>
      apiClient.get<ApiResponse<ElementoTareaFaltante[]>>(
        "/api/elementostareas/faltantes",
        params,
      ),
  })
}

export interface GenerarResultado {
  solicitadasTotal: number
  creadas: number
  yaExistian: number
  invalidas: number
}

export function useGenerarSeleccionadas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<{ elementoId: string; tareaId: string }>) =>
      apiClient.post<ApiResponse<GenerarResultado>>(
        "/api/elementostareas/generar",
        { items },
      ),
    onSuccess: () => {
      // Refrescar el listado de faltantes y cualquier vista dependiente.
      qc.invalidateQueries({ queryKey: ["elementostareas"] })
      qc.invalidateQueries({ queryKey: ["tareas"] })
      qc.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
