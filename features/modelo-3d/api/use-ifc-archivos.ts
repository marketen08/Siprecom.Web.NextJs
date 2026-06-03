import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  ProyectoIfcArchivo,
  ProyectoIfcArchivoCreateInput,
  ProyectoIfcArchivoUrl,
} from "../types"

const QK = (proyectoId: string | null | undefined) =>
  ["proyectos", proyectoId, "ifc"] as const

export function useGetIfcArchivos(proyectoId: string | null | undefined) {
  return useQuery({
    queryKey: QK(proyectoId),
    queryFn: () =>
      apiClient.get<ApiResponse<ProyectoIfcArchivo[]>>(
        `/api/proyectos/${proyectoId}/ifc`,
      ),
    enabled: !!proyectoId,
  })
}

// Uso fetch directo en lugar de apiClient porque éste no maneja FormData.
// El backend espera multipart con campos `nombre`, `disciplina`, `archivo`.
export function useUploadIfcArchivo(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProyectoIfcArchivoCreateInput) => {
      const fd = new FormData()
      fd.append("nombre", input.nombre)
      if (input.disciplina) fd.append("disciplina", input.disciplina)
      fd.append("archivo", input.archivo)
      const res = await fetch(`/api/proyectos/${proyectoId}/ifc`, {
        method: "POST",
        body: fd,
      })
      const body = await res.json().catch(() => ({ message: "Error al cargar el archivo" }))
      if (!res.ok) throw new Error(formatError(body))
      return body as ApiResponse<ProyectoIfcArchivo>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(proyectoId) })
    },
  })
}

export function useDeleteIfcArchivo(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivoId: string) =>
      apiClient.delete<ApiResponse<boolean>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(proyectoId) }),
  })
}

/**
 * Pide la SAS URL del archivo on-demand (no es useQuery — no queremos prefetch
 * porque la URL caduca a los 60 min y solo la necesitamos cuando se abre el viewer).
 */
export async function fetchIfcDownloadUrl(
  proyectoId: string,
  archivoId: string,
): Promise<ProyectoIfcArchivoUrl> {
  const resp = await apiClient.get<ApiResponse<ProyectoIfcArchivoUrl>>(
    `/api/proyectos/${proyectoId}/ifc/${archivoId}/download`,
  )
  if (!resp?.data?.url) {
    throw new Error(resp?.message ?? "No se pudo obtener la URL del archivo.")
  }
  return resp.data
}

/**
 * Descarga el IFC como ArrayBuffer.
 *
 * Estrategia:
 *  1. Intenta fetch directo a la SAS URL (sin tocar la API → menos latencia + bandwidth).
 *  2. Si el browser bloquea por CORS (típicamente `TypeError: Failed to fetch`
 *     cuando el storage account no tiene reglas CORS), reintenta vía el proxy
 *     `/api/proyectos/.../ifc/.../stream`, que stream-ea desde el backend.
 */
export async function downloadIfcBuffer(
  proyectoId: string,
  archivoId: string,
): Promise<ArrayBuffer> {
  // 1) Intento directo al blob (SAS).
  try {
    const url = await fetchIfcDownloadUrl(proyectoId, archivoId)
    const res = await fetch(url.url)
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar el archivo.`)
    return await res.arrayBuffer()
  } catch (e) {
    const msg = (e as Error).message ?? ""
    // CORS / red caída cae acá como TypeError("Failed to fetch"). Reintentamos
    // vía proxy. Cualquier otro error lo dejamos pasar para no enmascarar bugs.
    const esCors = msg.includes("Failed to fetch") || msg.includes("NetworkError")
    if (!esCors) throw e
  }

  // 2) Fallback proxy backend.
  const proxyRes = await fetch(`/api/proyectos/${proyectoId}/ifc/${archivoId}/stream`)
  if (!proxyRes.ok) {
    const body = await proxyRes.json().catch(() => ({}))
    throw new Error(body?.message ?? `HTTP ${proxyRes.status} al descargar el archivo (proxy).`)
  }
  return await proxyRes.arrayBuffer()
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
  return body?.message ?? "Error al cargar el archivo"
}
