import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export interface SugerenciaTarea {
  /** Id de la tarea representante: es lo que se manda al importar. */
  tareaId: string
  nombre: string
  nivelNombre: string | null
  planillaCodigo: string | null
  planillaNombre: string | null
  procedimientoNombre: string | null
  /** En cuántos proyectos del equipo existe esta misma regla. */
  proyectos: number
  proyectoEjemplo: string | null
  /** Trae un override de firmas propio, que pisa la config del proyecto. */
  traeFirmasPropias: boolean
  /** Nombre de su predecesora en el origen; la dependencia viaja sólo si se importa también. */
  precedenteNombre: string | null
}

export interface SugerenciasTareasGrupo {
  elementoTipoId: string
  elementoTipoNombre: string | null
  especialidadNombre: string | null
  /** Tipo portador de tareas de un test pack: el grupo son paquetes, no elementos de campo. */
  esSintetico: boolean
  elementosEnObra: number
  tareas: SugerenciaTarea[]
}

export interface TipoSinSugerencias {
  elementoTipoId: string
  elementoTipoNombre: string | null
  especialidadNombre: string | null
  elementosEnObra: number
}

export interface SugerenciasTareasPreview {
  tiposSinTareas: number
  tiposConSugerencias: number
  sugerenciasTotal: number
  proyectosConsultados: number
  equipoNombre: string | null
  /** False = se buscó en todos los proyectos, sin acotar por equipo. */
  acotadoPorEquipo: boolean
  grupos: SugerenciasTareasGrupo[]
  sinSugerencias: TipoSinSugerencias[]
}

export interface ImportarSugerenciasResultado {
  importadas: number
  omitidas: number
  tareasCreadasIds: string[]
  motivos: string[]
}

/**
 * Tareas de otros proyectos del mismo equipo de administración, para los tipos de elemento
 * que este proyecto tiene en la obra y no tiene configurados.
 *
 * Las equivalentes vienen deduplicadas, con en cuántos proyectos aparece cada una: ese es el
 * dato con el que se decide qué traer.
 */
export function useGetSugerenciasTareas() {
  return useQuery({
    queryKey: ["tareas-sugerencias"],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<SugerenciasTareasPreview>>(
        "/api/tareas/sugerencias",
      )
      return resp?.data ?? null
    },
    // Sin cache: se entra acá justo después de importar elementos o tareas.
    staleTime: 0,
  })
}

export function useImportarSugerenciasTareas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tareaIds: string[]) => {
      const resp = await apiClient.post<ApiResponse<ImportarSugerenciasResultado>>(
        "/api/tareas/sugerencias/importar",
        { tareaIds },
      )
      return resp?.data ?? null
    },
    onSuccess: () => {
      // El catálogo del proyecto cambió: el listado, los selects y los dos paneles de
      // diagnóstico quedan viejos.
      queryClient.invalidateQueries({ queryKey: ["tareas"] })
      queryClient.invalidateQueries({ queryKey: ["tareas-select"] })
      queryClient.invalidateQueries({ queryKey: ["tareas-sugerencias"] })
      queryClient.invalidateQueries({ queryKey: ["tipos-sin-tareas"] })
      queryClient.invalidateQueries({ queryKey: ["tareas-sin-elementos"] })
    },
  })
}
