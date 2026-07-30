import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

// ─── Tipos ────────────────────────────────────────────────────────────

/** Estados posibles de una ElementoTarea (enum del backend). */
export const ESTADO_ET = {
  PENDIENTE: 1,
  EN_PROCESO: 2,
  COMPLETADO: 3,
  APROBADO: 4,
  RECHAZADO: 5,
  CANCELADO: 6,
  FIRMADO: 7,
} as const

export type EstadoET = (typeof ESTADO_ET)[keyof typeof ESTADO_ET]

export const ESTADO_ET_LABEL: Record<number, string> = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  4: "Firmado físico",
  5: "Rechazado",
  6: "Cancelado",
  7: "Firmado",
}

export interface ElementoTareaRow {
  id: string
  elementoId: string
  elementoTag: string | null
  elementoNombre: string | null
  elementoCodigo: number | null
  tareaId: string
  tareaNombre: string | null
  nivelNombre: string | null
  estado: EstadoET
  estadoTexto: string | null
  motivoRechazo: string | null
  fechaPlanificada: string | null
  fechaLimite: string | null
  asignadoA: string | null
  asignadoNombre: string | null
  porcentajeAvance: number
  registroId: string | null
}

/** Buckets simplificados para los chips de coordinación. Mapea al enum backend EstadoCoordinacion. */
export const ESTADO_COORD = {
  PENDIENTE: 1,
  ASIGNADA: 2,
  COMPLETADA_FIRMADA: 3,
} as const
export type EstadoCoord = (typeof ESTADO_COORD)[keyof typeof ESTADO_COORD]

export interface CoordinacionFiltros {
  sistemaId?: string
  subSistemaId?: string
  nivelId?: string
  especialidadId?: string
  elementoTipoId?: string
  tareaId?: string
  /** Filtro Estado detallado (dentro del sheet). Cualquiera de los 7 estados backend. */
  estados?: EstadoET[]
  asignadoA?: string
  /** Bucket coordinación (chip principal). */
  estadoCoord?: EstadoCoord
  /** Default false: excluye CANCELADAS/RECHAZADAS. Toggle dentro del sheet. */
  incluirCanceladasRechazadas?: boolean
}

// Backend usa `List<EstadoElementoTarea>` en el filter. Traducimos.
function toBackendFilter(f: CoordinacionFiltros) {
  return {
    sistemaId: null,
    subSistemaId: f.subSistemaId ?? null,
    nivelId: f.nivelId ?? null,
    especialidadId: f.especialidadId ?? null,
    elementoTipoId: f.elementoTipoId ?? null,
    tareaId: f.tareaId ?? null,
    asignadoA: f.asignadoA ?? null,
    estados: f.estados && f.estados.length > 0 ? f.estados : null,
    estadoCoord: f.estadoCoord ?? null,
    incluirCanceladasRechazadas: f.incluirCanceladasRechazadas ?? false,
  }
}

// ─── Listado paginado ────────────────────────────────────────────────

/**
 * Shape del PagedResult del backend (Siprecom.Server.Core.Helpers.PagedResult).
 * Serializa como { data, total, page, pageSize, hasNextPage } — usá `total` para
 * el count real de filas.
 */
interface PagedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasNextPage?: boolean
}

// ─── Contadores por bucket (chips) ────────────────────────────────────

export interface CoordinacionCounts {
  pendiente: number
  asignada: number
  completadaFirmada: number
  canceladas: number
  rechazadas: number
  canceladasRechazadas: number
  total: number
}

/** Los conteos ignoran EstadoCoord (así cada chip cuenta lo suyo) pero respetan el resto de filtros. */
export function useCoordinacionCounts(filtros: CoordinacionFiltros) {
  // Excluimos el filtro de estado para que los conteos reflejen "cuánto entra en cada bucket
  // dado el resto del contexto" (subsistema, especialidad, responsable, etc).
  const { estadoCoord: _e, estados: _es, ...rest } = filtros
  return useQuery<ApiResponse<CoordinacionCounts>, Error, CoordinacionCounts>({
    queryKey: ["elementostareas", "coordinacion", "counts", rest],
    queryFn: () =>
      apiClient.post<ApiResponse<CoordinacionCounts>>(
        "/api/elementostareas/coordinacion/counts",
        toBackendFilter(rest as CoordinacionFiltros),
      ),
    select: (resp) => resp.data,
    staleTime: 1000 * 30,
  })
}

export function useSearchElementosTareas(
  filtros: CoordinacionFiltros,
  page: number,
  pageSize: number,
) {
  return useQuery<PagedResult<ElementoTareaRow>>({
    queryKey: ["elementostareas", "coordinacion", filtros, page, pageSize],
    queryFn: () =>
      apiClient.post<PagedResult<ElementoTareaRow>>("/api/elementostareas/search", {
        page,
        pageSize,
        filter: toBackendFilter(filtros),
        orderBy: "FechaPlanificada",
        orderDescending: false,
      }),
    // La lista se refresca sola cuando se ejecuta un mutation via invalidateQueries.
    staleTime: 1000 * 30,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────

export function useDeleteElementoTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiResponse<boolean>>(`/api/elementostareas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elementostareas"] })
    },
  })
}

export function useCancelarElementoTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      apiClient.post<ApiResponse<ElementoTareaRow>>(
        `/api/elementostareas/${id}/cancelar`,
        { motivo },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elementostareas"] })
    },
  })
}

// ─── Bulk actions ────────────────────────────────────────────────────

export interface BulkResultRow {
  id: string
  elementoTag: string | null
  tareaNombre: string | null
  motivo: string
}

export interface BulkResult {
  total: number
  ok: number
  rechazadas: BulkResultRow[]
}

/**
 * Request base para acciones bulk. El caller elige modo IDs o modo Filter.
 * - IDs: lista específica (checkboxes en la UI).
 * - Filter: aplica a TODAS las ETs que matchean (banner "seleccionar todos").
 * Si vienen los dos, gana IDs. Si ninguno, el backend no aplica nada.
 */
export type BulkTargets =
  | { ids: string[] }
  | { filter: CoordinacionFiltros }

function toBulkBody(targets: BulkTargets, extra: Record<string, unknown>) {
  if ("ids" in targets) return { ids: targets.ids, ...extra }
  return { filter: toBackendFilter(targets.filter), ...extra }
}

export function useBulkAsignar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkTargets & { asignadoA: string | null }) => {
      const { asignadoA, ...targets } = input
      return apiClient
        .post<ApiResponse<BulkResult>>(
          "/api/elementostareas/bulk/asignar",
          toBulkBody(targets as BulkTargets, { asignadoA: asignadoA ?? "" }),
        )
        .then((r) => r.data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["elementostareas"] }) },
  })
}

export function useBulkCancelar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkTargets & { motivo: string }) => {
      const { motivo, ...targets } = input
      return apiClient
        .post<ApiResponse<BulkResult>>(
          "/api/elementostareas/bulk/cancelar",
          toBulkBody(targets as BulkTargets, { motivo }),
        )
        .then((r) => r.data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["elementostareas"] }) },
  })
}

export function useBulkReactivar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkTargets) =>
      apiClient
        .post<ApiResponse<BulkResult>>(
          "/api/elementostareas/bulk/reactivar",
          toBulkBody(input, {}),
        )
        .then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["elementostareas"] }) },
  })
}

export function useReactivarElementoTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiResponse<ElementoTareaRow>>(
        `/api/elementostareas/${id}/reactivar`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elementostareas"] })
    },
  })
}

export function useActualizarFechaPlanificadaET() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fecha }: { id: string; fecha: string }) =>
      // El backend solo aplica FechaPlanificada si HasValue → mandar null borra
      // no funciona por este endpoint (usar la vista detallada para eso).
      // La UI inline solo permite setear una fecha (input date no puede quedar vacío
      // sin permitir explícitamente clear).
      apiClient.put<ApiResponse<ElementoTareaRow>>(`/api/elementostareas/${id}`, {
        id,
        fechaPlanificada: fecha,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elementostareas"] })
    },
  })
}

export function useAsignarResponsableET() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, asignadoA }: { id: string; asignadoA: string | null }) =>
      // UpdateElementoTareaAsync solo pisa los campos que vienen != null en el DTO.
      // Enviamos únicamente AsignadoA. String vacío = "sin asignar" al backend.
      apiClient.put<ApiResponse<ElementoTareaRow>>(`/api/elementostareas/${id}`, {
        id,
        asignadoA: asignadoA ?? "",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elementostareas"] })
    },
  })
}
