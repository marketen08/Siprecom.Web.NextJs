import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import {
  EstadoProcesamientoIfc,
  type ProyectoIfcArchivo,
  type ProyectoIfcArchivoCreateInput,
  type ProyectoIfcArchivoUrl,
} from "../types"
import { clearCachedIfc, getCachedIfc, setCachedIfc } from "../ifc-cache"

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
    // Polling cada 3s mientras haya un archivo en Pendiente o Procesando,
    // para que el UI se actualice automáticamente cuando el worker termine.
    refetchInterval: (query) => {
      const items = query.state.data?.data ?? []
      const enProgreso = items.some(
        (a) => a.estadoProcesamiento === EstadoProcesamientoIfc.Pendiente
            || a.estadoProcesamiento === EstadoProcesamientoIfc.Procesando
            || a.apsTranslationStatus === 1 /* Pendiente */
            || a.apsTranslationStatus === 2 /* EnProceso */,
      )
      return enProgreso ? 3000 : false
    },
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

export function useMarcarIfcPrincipal(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivoId: string) =>
      apiClient.put<ApiResponse<ProyectoIfcArchivo>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}/principal`,
        {},
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(proyectoId) }),
  })
}

/** Trae el IFC principal del proyecto, o null si no hay. */
export function useGetIfcPrincipal(proyectoId: string | null | undefined) {
  return useQuery({
    queryKey: ["proyectos", proyectoId, "ifc", "principal"],
    enabled: !!proyectoId,
    queryFn: () =>
      apiClient.get<ApiResponse<ProyectoIfcArchivo>>(
        `/api/proyectos/${proyectoId}/ifc/principal`,
      ),
    // El visor llama a este endpoint cada N segundos mientras el archivo todavía
    // se está procesando, para reflejar el progreso. Incluye tanto el pipeline
    // de xbim (IFC) como el de Model Derivative (NWD).
    refetchInterval: (query) => {
      const archivo = query.state.data?.data
      if (!archivo) return false
      const ifcEnProgreso = archivo.estadoProcesamiento === EstadoProcesamientoIfc.Pendiente
        || archivo.estadoProcesamiento === EstadoProcesamientoIfc.Procesando
      const apsEnProgreso = archivo.apsTranslationStatus === 1 /* Pendiente */
        || archivo.apsTranslationStatus === 2 /* EnProceso */
      return (ifcEnProgreso || apsEnProgreso) ? 3000 : false
    },
  })
}

export function useDeleteIfcArchivo(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (archivoId: string) => {
      const r = await apiClient.delete<ApiResponse<boolean>>(
        `/api/proyectos/${proyectoId}/ifc/${archivoId}`,
      )
      // Liberar la entrada del cache local — el archivo ya no existe.
      void clearCachedIfc(archivoId)
      return r
    },
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

export interface DownloadProgress {
  /** Bytes descargados hasta ahora. */
  loaded: number
  /** Bytes totales si el server lo informa con Content-Length, sino null. */
  total: number | null
  /** "cache" = IndexedDB local, "direct" = SAS al blob, "proxy" = stream via backend. */
  via: "cache" | "direct" | "proxy"
}

/**
 * Descarga el IFC como ArrayBuffer.
 *
 * Estrategia (en orden):
 *  0. Cache local (IndexedDB) — si el archivo ya fue descargado antes en este
 *     browser, lo trae instantáneo sin tocar la red.
 *  1. Fetch directo a la SAS URL (sin tocar la API → menos latencia + bandwidth).
 *  2. Si el browser bloquea por CORS (típicamente `TypeError: Failed to fetch`
 *     cuando el storage account no tiene reglas CORS), reintenta vía el proxy
 *     `/api/proyectos/.../ifc/.../stream`, que stream-ea desde el backend.
 *
 * Después de descargar (1 o 2), el buffer queda guardado en IndexedDB para
 * próximas visitas. Acepta `expectedSize` para validar el cache contra el
 * tamaño actual del archivo (si cambia, se ignora el cache stale).
 */
export async function downloadIfcBuffer(
  proyectoId: string,
  archivoId: string,
  onProgress?: (p: DownloadProgress) => void,
  expectedSize?: number | null,
): Promise<ArrayBuffer> {
  // 0) Cache local — instantáneo si ya está.
  const cached = await getCachedIfc(archivoId, expectedSize)
  if (cached) {
    onProgress?.({ loaded: cached.byteLength, total: cached.byteLength, via: "cache" })
    return cached
  }

  // 1) Intento directo al blob (SAS).
  let buffer: ArrayBuffer | null = null
  try {
    const url = await fetchIfcDownloadUrl(proyectoId, archivoId)
    const res = await fetch(url.url)
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar el archivo.`)
    buffer = await readWithProgress(res, "direct", onProgress)
  } catch (e) {
    const msg = (e as Error).message ?? ""
    const esCors = msg.includes("Failed to fetch") || msg.includes("NetworkError")
    if (!esCors) throw e
  }

  // 2) Fallback proxy backend si SAS falló por CORS.
  if (buffer === null) {
    const proxyRes = await fetch(`/api/proyectos/${proyectoId}/ifc/${archivoId}/stream`)
    if (!proxyRes.ok) {
      const body = await proxyRes.json().catch(() => ({}))
      throw new Error(body?.message ?? `HTTP ${proxyRes.status} al descargar el archivo (proxy).`)
    }
    buffer = await readWithProgress(proxyRes, "proxy", onProgress)
  }

  // Best-effort: guardar en cache para próximas visitas. Si IndexedDB falla
  // (modo incógnito, quota, etc) silenciamos — no rompe la descarga.
  void setCachedIfc(archivoId, buffer)
  return buffer
}

/** Lee el body por chunks reportando progreso. Si no hay onProgress, atajo directo a arrayBuffer(). */
async function readWithProgress(
  res: Response,
  via: "direct" | "proxy",
  onProgress?: (p: DownloadProgress) => void,
): Promise<ArrayBuffer> {
  if (!onProgress || !res.body) return res.arrayBuffer()

  const totalHeader = res.headers.get("content-length")
  const total = totalHeader ? parseInt(totalHeader, 10) : null

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  // Throttle: reportamos cada 64KB para no saturar el ciclo de render.
  let lastReportAt = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    if (loaded - lastReportAt >= 64 * 1024) {
      onProgress({ loaded, total, via })
      lastReportAt = loaded
    }
  }
  onProgress({ loaded, total, via })

  // Concatenamos los chunks en un único ArrayBuffer.
  const out = new Uint8Array(loaded)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out.buffer
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
