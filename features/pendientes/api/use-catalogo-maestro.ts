import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  PendienteCatalogoMaestro,
  PendienteCatalogoMaestroCreate,
  PendienteCatalogoMaestroUpdate,
  PendienteCatalogoResolverResult,
} from "../types"

// ─── Query: Listado ───────────────────────────────────────────────────

export function useGetPendienteCatalogo() {
  return useQuery({
    queryKey: ["pendientes-catalogo"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteCatalogoMaestro[]>>("/api/pendientes-catalogo"),
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Query: Resolver ──────────────────────────────────────────────────
// Devuelve `null` cuando no hay match (backend responde 404). Cualquier
// otro error tira excepción normal.

interface ResolverInput {
  nivelId: string
  especialidadId: string
  tipoId: string
  accionId: string
  motivoId: string
}

async function fetchResolver(input: ResolverInput): Promise<PendienteCatalogoResolverResult | null> {
  const qs = new URLSearchParams({
    nivelId: input.nivelId,
    especialidadId: input.especialidadId,
    tipoId: input.tipoId,
    accionId: input.accionId,
    motivoId: input.motivoId,
  }).toString()
  const res = await fetch(`/api/pendientes-catalogo/resolver?${qs}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Resolver falló: HTTP ${res.status}`)
  const body = (await res.json()) as ApiResponse<PendienteCatalogoResolverResult>
  return body.data ?? null
}

/**
 * Cuando `input` es null, la query queda deshabilitada — el frontend sólo
 * consulta cuando las 5 dimensiones están cargadas.
 */
export function useResolverPendienteCatalogo(input: ResolverInput | null) {
  return useQuery({
    queryKey: ["pendientes-catalogo", "resolver", input],
    queryFn: () => fetchResolver(input!),
    enabled: input !== null,
    staleTime: 1000 * 60 * 5,
    retry: false, // 404 es un "no match" válido, no queremos reintentar
  })
}

// ─── Mutations ────────────────────────────────────────────────────────

export function useCreatePendienteCatalogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PendienteCatalogoMaestroCreate) =>
      apiClient.post<ApiResponse<PendienteCatalogoMaestro>>("/api/pendientes-catalogo", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-catalogo"] }),
  })
}

export function useUpdatePendienteCatalogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: PendienteCatalogoMaestroUpdate & { id: string }) =>
      apiClient.put<ApiResponse<PendienteCatalogoMaestro>>(`/api/pendientes-catalogo/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-catalogo"] }),
  })
}

export function useDeletePendienteCatalogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiResponse<boolean>>(`/api/pendientes-catalogo/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-catalogo"] }),
  })
}
