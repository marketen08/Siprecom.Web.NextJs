import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  ColoresPorEstado,
  EntidadFiltro,
  FiltroResultado,
  FiltroVisor,
  ProyectoIfcEntidad,
  ProyectoIfcEntidadesPage,
} from "../types"

const QK_PAGE = (
  archivoId: string | null,
  filtro: EntidadFiltro,
  busqueda: string,
  page: number,
  dimensiones: FiltroVisor | null,
) =>
  ["ifc", archivoId, "entidades", filtro, busqueda, page, dimensiones] as const

const QK_ARCHIVO = (proyectoId: string | null) =>
  ["proyectos", proyectoId, "ifc"] as const

export function useGetIfcEntidades(
  proyectoId: string,
  archivoId: string | null,
  filtro: EntidadFiltro,
  busqueda: string,
  page: number,
  pageSize = 50,
  /** Filtro de dimensiones del visor (Sistema/SubSistema/Especialidad). */
  dimensiones?: FiltroVisor | null,
) {
  return useQuery({
    queryKey: QK_PAGE(archivoId, filtro, busqueda, page, dimensiones ?? null),
    enabled: !!archivoId,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (filtro !== "todas") params.set("filtro", filtro)
      if (busqueda.trim()) params.set("busqueda", busqueda.trim())
      // .NET espera multiples valores como `?key=a&key=b` — no como CSV.
      if (dimensiones) {
        dimensiones.sistemaIds.forEach((id) => params.append("sistemaIds", id))
        dimensiones.subSistemaIds.forEach((id) => params.append("subSistemaIds", id))
        dimensiones.especialidadIds.forEach((id) => params.append("especialidadIds", id))
        dimensiones.estadosVisuales.forEach((s) => params.append("estadosVisuales", String(s)))
      }
      return apiClient.get<ApiResponse<ProyectoIfcEntidadesPage>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades?${params.toString()}`,
      )
    },
  })
}

export function useVincularIfcEntidad(proyectoId: string, archivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entidadId, elementoId }: { entidadId: string; elementoId: string }) =>
      apiClient.put<ApiResponse<ProyectoIfcEntidad>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades/${entidadId}/vincular`,
        { elementoId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ifc", archivoId, "entidades"] })
      qc.invalidateQueries({ queryKey: QK_ARCHIVO(proyectoId) })
    },
  })
}

export function useDesvincularIfcEntidad(proyectoId: string, archivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entidadId: string) =>
      apiClient.delete<ApiResponse<ProyectoIfcEntidad>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades/${entidadId}/vincular`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ifc", archivoId, "entidades"] })
      qc.invalidateQueries({ queryKey: QK_ARCHIVO(proyectoId) })
    },
  })
}

export function useProcesarIfcArchivo(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivoId: string) =>
      apiClient.post<ApiResponse<unknown>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/procesar`,
        {},
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_ARCHIVO(proyectoId) }),
  })
}

/**
 * Re-bootstrap LIMPIO: borra toda la estructura del proyecto (Sistemas,
 * SubSistemas, Elementos, etc.) y vuelve a correr el bootstrap con la config
 * de ApsTagProperties actual. Destructivo — el caller debe confirmar.
 */
export function useReBootstrapIfcArchivo(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivoId: string) =>
      apiClient.post<ApiResponse<unknown>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/re-bootstrap`,
        {},
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_ARCHIVO(proyectoId) }),
  })
}

/**
 * Resuelve un set de IfcGuid → datos del Elemento vinculado.
 * Lo usa el viewer cuando el usuario clickea en una entidad 3D.
 */
export async function resolverEntidadesPorGuids(
  proyectoId: string,
  archivoId: string,
  ifcGuids: string[],
): Promise<ProyectoIfcEntidad[]> {
  if (ifcGuids.length === 0) return []
  const resp = await apiClient.post<ApiResponse<ProyectoIfcEntidad[]>>(
    `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades/resolver`,
    { ifcGuids },
  )
  return resp?.data ?? []
}

/**
 * Trae los GUIDs particionados por estado del Elemento vinculado + métricas
 * agregadas (% avance, conteos de tareas). El visor los usa para pintar cada
 * bucket de un color semáforo. Las entidades sin vínculo no aparecen —
 * mantienen su color IFC original.
 *
 * El cuadro respeta el filtro visual: Sistema/SubSistema/Especialidad acotan
 * QUÉ elementos entran al cómputo; NivelIds acota QUÉ tareas se cuentan tanto
 * para clasificar el estado del elemento como para el %. Si se filtra solo
 * PRECOMISIONADO, los elementos con toda esa fase terminada se ven en verde
 * aunque tengan tareas COM pendientes — y el % es el avance de PRECOM.
 */
export function useColoresPorEstado(
  proyectoId: string | null,
  archivoId: string | null,
  activo: boolean,
  filtro?: FiltroVisor | null,
) {
  // EstadosVisuales y OcultarNoVinculadas son del ghost del visor — no afectan
  // los buckets de color, así que no los mandamos.
  const body = {
    sistemaIds:      filtro?.sistemaIds      ?? [],
    subSistemaIds:   filtro?.subSistemaIds   ?? [],
    especialidadIds: filtro?.especialidadIds ?? [],
    nivelIds:        filtro?.nivelIds        ?? [],
  }
  return useQuery({
    queryKey: [
      "ifc", archivoId, "colores-por-estado",
      body.sistemaIds.join(","),
      body.subSistemaIds.join(","),
      body.especialidadIds.join(","),
      body.nivelIds.join(","),
    ],
    enabled: activo && !!proyectoId && !!archivoId,
    // No staleTime — al activar el toggle queremos data fresca; los estados de
    // ElementoTarea pueden cambiar mucho durante la jornada.
    queryFn: () =>
      apiClient.post<ApiResponse<ColoresPorEstado>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades/colores-por-estado`,
        body,
      ),
  })
}

/**
 * Resuelve los IfcGuids que cumplen los filtros visuales (sistema/subsistema/
 * especialidad). El visor los usa para aplicar el modo "ghost": las entidades
 * fuera del filtro quedan grises/transparentes.
 */
export async function filtrarEntidades(
  proyectoId: string,
  archivoId: string,
  filtro: FiltroVisor,
): Promise<FiltroResultado> {
  const resp = await apiClient.post<ApiResponse<FiltroResultado>>(
    `/api/proyectos/${proyectoId}/ifc/${archivoId}/entidades/filtrar`,
    filtro,
  )
  return resp?.data ?? { guidsCoinciden: [], totalCoinciden: 0, totalEntidades: 0 }
}
