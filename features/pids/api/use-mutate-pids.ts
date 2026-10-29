import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PidArchivo, PidArchivoUpdateInput } from "../types"

/** Rotaciones horarias admitidas, en grados. */
export type RotacionGrados = 0 | 90 | 180 | 270

interface CreatePidInput {
  codigo: string
  nombre: string
  descripcion?: string
  subSistemaIds: string[]
  archivo: File
  /**
   * Rotación elegida en la previsualización. Se escribe en el PDF antes de
   * guardarlo, así el plano queda derecho también al descargarlo o imprimirlo.
   */
  rotacionGrados?: RotacionGrados
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
      fd.append("rotacionGrados", String(input.rotacionGrados ?? 0))

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
    mutationFn: async (
      input: { archivo: File; rotacionGrados?: RotacionGrados },
    ): Promise<ApiResponse<PidArchivo>> => {
      const { archivo, rotacionGrados } = input
      const fd = new FormData()
      fd.append("archivo", archivo)
      fd.append("rotacionGrados", String(rotacionGrados ?? 0))
      const res = await fetch(`/api/pid-archivos/${id}/archivo`, { method: "POST", body: fd })
      const body = await res.json().catch(() => ({ message: "Error al reemplazar el PID" }))
      if (!res.ok) throw new Error(formatError(body))
      return body
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
      // Cambió el blob: la SAS URL anterior apunta a un archivo que ya no está.
      qc.invalidateQueries({ queryKey: ["pid-download"] })
    },
  })
}

/**
 * Gira el PDF de un PID ya cargado. El backend reescribe el archivo y mueve con
 * él las coordenadas de los pines, así que no hace falta recolocar nada a mano.
 */
export function useRotarPid(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (grados: Exclude<RotacionGrados, 0>) =>
      apiClient.post<ApiResponse<PidArchivo>>(`/api/pid-archivos/${id}/rotar`, { grados }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pid-archivos"] })
      // El visor cachea el PDF por SAS URL — al cambiar el blob hay que
      // invalidar para que vuelva a pedir la URL nueva.
      qc.invalidateQueries({ queryKey: ["pid-download"] })
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
