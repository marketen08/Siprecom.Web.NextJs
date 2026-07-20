import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PidArchivo, PidArchivoUpdateInput } from "../types"

interface CreatePidInput {
  codigo: string
  nombre: string
  descripcion?: string
  subSistemaIds: string[]
  archivo: File
}

/** Crea un PidArchivo subiendo el PDF vía multipart. */
export function useCreatePid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePidInput): Promise<ApiResponse<PidArchivo>> => {
      const fd = new FormData()
      fd.append("codigo", input.codigo)
      fd.append("nombre", input.nombre)
      if (input.descripcion) fd.append("descripcion", input.descripcion)
      input.subSistemaIds.forEach((sid) => fd.append("subSistemaIds", sid))
      fd.append("archivo", input.archivo)

      const res = await fetch(`/api/pid-archivos`, { method: "POST", body: fd })
      const body = await res.json().catch(() => ({ message: "Error al subir el PID" }))
      if (!res.ok) throw new Error(formatError(body))
      return body
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
    },
  })
}

export function useUpdatePid(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PidArchivoUpdateInput) =>
      apiClient.put<ApiResponse<PidArchivo>>(`/api/pid-archivos/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
    },
  })
}

/** Reemplaza el PDF del PID conservando el mismo id (por ejemplo cuando sale una nueva revisión). */
export function useReemplazarArchivoPid(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (archivo: File): Promise<ApiResponse<PidArchivo>> => {
      const fd = new FormData()
      fd.append("archivo", archivo)
      const res = await fetch(`/api/pid-archivos/${id}/archivo`, { method: "POST", body: fd })
      const body = await res.json().catch(() => ({ message: "Error al reemplazar el PID" }))
      if (!res.ok) throw new Error(formatError(body))
      return body
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
    },
  })
}

export function useDeletePid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<ApiResponse<boolean>>(`/api/pid-archivos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
    },
  })
}

/** SAS URL de corta vida — se pide on-demand cuando se abre el visor. */
export async function fetchPidDownloadUrl(id: string): Promise<{ url: string; nombreArchivo: string | null; expiraEnMinutos: number }> {
  const resp = await apiClient.get<ApiResponse<{ url: string; nombreArchivo: string | null; expiraEnMinutos: number }>>(
    `/api/pid-archivos/${id}/download`,
  )
  if (!resp?.data?.url) throw new Error(resp?.message ?? "No se pudo obtener el PID.")
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
  return body?.message ?? "Error al procesar el PID"
}
