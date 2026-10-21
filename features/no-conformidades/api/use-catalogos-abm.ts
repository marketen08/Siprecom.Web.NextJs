import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

/**
 * ABM de los dos catálogos del módulo: los tipos de informe (NC / SAC / SOM) y los
 * motivos que clasifican el origen del hallazgo.
 *
 * Son endpoints distintos de los de `use-catalogos.ts`: ésos son la lectura que usa
 * el formulario del informe y vienen sin `enUso`; éstos los lee la pantalla de
 * configuración, que necesita saber qué fila tiene informes vivos para apagarle el
 * botón de borrar en vez de dejar intentar y mostrar el error del backend.
 *
 * Cada mutación invalida también los catálogos de lectura: si alguien da de alta un
 * motivo, el select del formulario tiene que ofrecerlo sin esperar los 10 minutos de
 * staleTime de esa query.
 */

export interface NoConformidadTipoAdmin {
  id: string
  /** Prefijo del correlativo: NC / SAC / SOM. No se edita después del alta. */
  codigo: string
  nombre: string
  descripcion: string | null
  bloqueaCertificado: boolean
  orden: number
  /** Hay informes activos de este tipo: no se puede eliminar. */
  enUso: boolean
}

export interface NoConformidadTipoWrite {
  codigo: string
  nombre: string
  descripcion?: string | null
  bloqueaCertificado: boolean
  orden: number
}

export interface NoConformidadMotivoAdmin {
  id: string
  nombre: string
  enUso: boolean
}

const KEY_TIPOS = ["no-conformidades", "abm", "tipos"] as const
const KEY_MOTIVOS = ["no-conformidades", "abm", "motivos"] as const

function useInvalidar(key: readonly string[]) {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: key })
    void qc.invalidateQueries({ queryKey: ["no-conformidades", "catalogos"] })
  }
}

// ─── Tipos de informe ───────────────────────────────────────────────────

export function useGetNcTiposAbm() {
  return useQuery({
    queryKey: KEY_TIPOS,
    queryFn: () =>
      apiClient.get<ApiResponse<NoConformidadTipoAdmin[]>>("/api/no-conformidades-tipos"),
  })
}

export function useCreateNcTipo() {
  const invalidar = useInvalidar(KEY_TIPOS)
  return useMutation({
    mutationFn: (data: NoConformidadTipoWrite) =>
      apiClient.post<ApiResponse<NoConformidadTipoAdmin>>("/api/no-conformidades-tipos", data),
    onSuccess: invalidar,
  })
}

export function useUpdateNcTipo() {
  const invalidar = useInvalidar(KEY_TIPOS)
  return useMutation({
    // El código va en el body porque el DTO es el mismo que el del alta, pero el
    // backend lo ignora: está impreso en el correlativo de cada informe emitido.
    mutationFn: ({ id, ...data }: NoConformidadTipoWrite & { id: string }) =>
      apiClient.put<ApiResponse<NoConformidadTipoAdmin>>(
        `/api/no-conformidades-tipos/${id}`,
        data,
      ),
    onSuccess: invalidar,
  })
}

export function useDeleteNcTipo() {
  const invalidar = useInvalidar(KEY_TIPOS)
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/no-conformidades-tipos/${id}`),
    onSuccess: invalidar,
  })
}

// ─── Motivos ────────────────────────────────────────────────────────────

export function useGetNcMotivosAbm() {
  return useQuery({
    queryKey: KEY_MOTIVOS,
    queryFn: () =>
      apiClient.get<ApiResponse<NoConformidadMotivoAdmin[]>>("/api/no-conformidades-motivos"),
  })
}

export function useCreateNcMotivo() {
  const invalidar = useInvalidar(KEY_MOTIVOS)
  return useMutation({
    mutationFn: (nombre: string) =>
      apiClient.post<ApiResponse<NoConformidadMotivoAdmin>>("/api/no-conformidades-motivos", {
        nombre,
      }),
    onSuccess: invalidar,
  })
}

export function useUpdateNcMotivo() {
  const invalidar = useInvalidar(KEY_MOTIVOS)
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      apiClient.put<ApiResponse<NoConformidadMotivoAdmin>>(
        `/api/no-conformidades-motivos/${id}`,
        { nombre },
      ),
    onSuccess: invalidar,
  })
}

export function useDeleteNcMotivo() {
  const invalidar = useInvalidar(KEY_MOTIVOS)
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/no-conformidades-motivos/${id}`),
    onSuccess: invalidar,
  })
}
