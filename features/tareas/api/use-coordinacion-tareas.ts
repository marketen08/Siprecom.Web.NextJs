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

export interface CoordinacionFiltros {
  sistemaId?: string
  subSistemaId?: string
  nivelId?: string
  especialidadId?: string
  elementoTipoId?: string
  tareaId?: string
  estados?: EstadoET[]
  asignadoA?: string
  /** Se traduce a estados = [PENDIENTE] en el body. */
  soloPendientes?: boolean
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
    estados: f.soloPendientes
      ? [ESTADO_ET.PENDIENTE]
      : f.estados && f.estados.length > 0
      ? f.estados
      : null,
  }
}

// ─── Listado paginado ────────────────────────────────────────────────

interface PagedResult<T> {
  data: T[]
  totalRecords: number
  page: number
  pageSize: number
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
