import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export interface SubSistemaPlanoInfo {
  subSistemaId: string
  nombreArchivo: string | null
  contentType: string | null
  tamanioBytes: number | null
}

export interface SubSistemaPlanoUrl {
  url: string
  nombreArchivo: string | null
  expiraEnMinutos: number
}

// Sube/reemplaza el PDF del plano del subsistema. Usa fetch directo (multipart).
// Invalida los caches de avance para que los flags `tienePlano` se actualicen en
// las listas de la página /ejecucion/subsistemas.
export function useUploadPlanoSubsistema(subSistemaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (archivo: File): Promise<ApiResponse<SubSistemaPlanoInfo>> => {
      const fd = new FormData()
      fd.append("archivo", archivo)
      const res = await fetch(`/api/subsistemas/${subSistemaId}/plano`, {
        method: "POST",
        body: fd,
      })
      const body = await res.json().catch(() => ({ message: "Error al subir el plano" }))
      if (!res.ok) throw new Error(formatError(body))
      return body
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subsistemas"] })
      qc.invalidateQueries({ queryKey: ["avance"] })
    },
  })
}

export function useDeletePlanoSubsistema(subSistemaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.delete<ApiResponse<boolean>>(`/api/subsistemas/${subSistemaId}/plano`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subsistemas"] })
      qc.invalidateQueries({ queryKey: ["avance"] })
    },
  })
}

// Pide la SAS URL temporal. Se invoca on-demand (no es useQuery) — no queremos prefetch.
export async function fetchPlanoUrl(subSistemaId: string): Promise<SubSistemaPlanoUrl> {
  const resp = await apiClient.get<ApiResponse<SubSistemaPlanoUrl>>(
    `/api/subsistemas/${subSistemaId}/plano/download`,
  )
  if (!resp?.data?.url) {
    throw new Error(resp?.message ?? "No se pudo obtener el plano.")
  }
  return resp.data
}

function formatError(body: any): string {
  if (Array.isArray(body?.errors)) {
    const lineas = body.errors.flatMap((e: any) =>
      Array.isArray(e?.errors)
        ? e.errors.map((m: string) => (e.field ? `${e.field}: ${m}` : m))
        : [],
    )
    if (lineas.length > 0) return lineas.join("\n")
  }
  return body?.message ?? "Error al subir el plano"
}
