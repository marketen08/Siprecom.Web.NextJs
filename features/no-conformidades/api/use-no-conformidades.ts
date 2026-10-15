import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, PagedResponse } from "@/features/proyectos/types"
import type {
  NoConformidad,
  NoConformidadDetalle,
  NoConformidadFilterInput,
} from "../types"
import type {
  NoConformidadCreateInput,
  NoConformidadUpdateInput,
} from "../schema"

/**
 * Hooks de datos del módulo de Calidad.
 *
 * Convención de invalidación: toda mutación invalida `["no-conformidades"]`
 * (el listado) y, cuando aplica, el detalle puntual. Las acciones del workflow
 * además pueden crear un informe nuevo (encadenado por ineficacia), así que
 * invalidan el listado completo sí o sí.
 */

const KEY = "no-conformidades"

// ── Lectura ────────────────────────────────────────────────────────────────

interface SearchParams {
  page?: number
  pageSize?: number
  filter?: NoConformidadFilterInput
  /** Permite montar el hook sin disparar el fetch (ej. con el sheet cerrado). */
  enabled?: boolean
}

export function useSearchNoConformidades(params: SearchParams = {}) {
  const { page = 1, pageSize = 20, filter, enabled = true } = params
  return useQuery({
    enabled,
    queryKey: [KEY, "search", { page, pageSize, filter }],
    queryFn: () =>
      apiClient.post<PagedResponse<NoConformidad>>("/api/no-conformidades/search", {
        page,
        pageSize,
        filter,
      }),
  })
}

export function useGetNoConformidad(id: string | null | undefined) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: [KEY, id],
    queryFn: () =>
      apiClient.get<ApiResponse<NoConformidadDetalle>>(`/api/no-conformidades/${id}`),
  })
}

/** Informes asociados a un pendiente — para el badge en su detalle. */
export function useNoConformidadesDePendiente(pendienteId: string | null | undefined) {
  return useQuery({
    enabled: Boolean(pendienteId),
    queryKey: [KEY, "por-pendiente", pendienteId],
    queryFn: () =>
      apiClient.get<ApiResponse<NoConformidad[]>>(
        `/api/no-conformidades/por-pendiente/${pendienteId}`,
      ),
  })
}

// ── Alta y edición ─────────────────────────────────────────────────────────

export function useCreateNoConformidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NoConformidadCreateInput) =>
      apiClient.post<ApiResponse<NoConformidad>>("/api/no-conformidades", data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      // Si nació escalando un pendiente, su badge tiene que aparecer al instante.
      if (vars.pendienteOrigenId) {
        qc.invalidateQueries({ queryKey: ["pendientes"] })
      }
    },
  })
}

export function useUpdateNoConformidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NoConformidadUpdateInput }) =>
      apiClient.put<ApiResponse<NoConformidad>>(`/api/no-conformidades/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, vars.id] })
    },
  })
}

// ── Workflow ───────────────────────────────────────────────────────────────

/** Acciones que viven en un solo segmento del path. */
type AccionSimple =
  | "evaluar"
  | "accion-inmediata"
  | "investigacion"
  | "aprobar"
  | "rechazar"
  | "cancelar"

interface TransicionInput {
  id: string
  accion: AccionSimple
  /** Payload de la etapa. Rechazo y cancelación exigen `comentario`. */
  body?: Record<string, unknown>
}

/**
 * Hook genérico para las transiciones de un solo segmento. Las de eficacia van
 * por `useEficacia` porque su path tiene un segmento más.
 */
export function useNoConformidadTransicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accion, body }: TransicionInput) =>
      apiClient.post<ApiResponse<NoConformidad>>(
        `/api/no-conformidades/${id}/${accion}`,
        body ?? {},
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, vars.id] })
    },
  })
}

interface EficaciaInput {
  id: string
  etapa: "objetivo" | "resultado"
  body: Record<string, unknown>
}

/**
 * Etapas de eficacia. La de `resultado` con `fueEficaz: false` hace que el
 * backend encadene un informe nuevo — por eso se invalida todo el listado y no
 * solo el detalle: aparece una fila más.
 */
export function useEficacia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, etapa, body }: EficaciaInput) =>
      apiClient.post<ApiResponse<NoConformidad>>(
        `/api/no-conformidades/${id}/eficacia/${etapa}`,
        body,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, vars.id] })
    },
  })
}

// ── Comentarios y vínculos ─────────────────────────────────────────────────

export function useAgregarComentario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comentario }: { id: string; comentario: string }) =>
      apiClient.post<ApiResponse<unknown>>(`/api/no-conformidades/${id}/comentarios`, {
        comentario,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.id] })
    },
  })
}

export function useVincularPendientes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pendienteIds }: { id: string; pendienteIds: string[] }) =>
      apiClient.post<ApiResponse<NoConformidadDetalle>>(
        `/api/no-conformidades/${id}/pendientes`,
        { pendienteIds },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.id] })
      qc.invalidateQueries({ queryKey: ["pendientes"] })
    },
  })
}
