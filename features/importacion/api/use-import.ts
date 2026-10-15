import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ImportacionJobEstado, ImportPreview, ImportResultado } from "../types"

interface ApiResponse<T> {
  message: string
  data: T
}

async function postFile<T>(url: string, archivo: File): Promise<ApiResponse<T>> {
  const fd = new FormData()
  fd.append("archivo", archivo)
  const res = await fetch(url, { method: "POST", body: fd })
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    const text = await res.text()
    throw new Error(`Respuesta no-JSON (${res.status}): ${text.slice(0, 300)}`)
  }
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? `Error ${res.status}`)
  return json
}

export function useImportPreview() {
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportPreview>("/api/import/preview", archivo),
  })
}

/**
 * Arranca el apply en background. Devuelve el jobId al toque — el frontend
 * hace polling con useImportStatus(jobId) para ver progreso. Reemplaza al
 * apply sincrónico viejo: proyectos de 10k+ elementos no soportan HTTP directo.
 */
export function useImportApply() {
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<{ jobId: string }>("/api/import/apply", archivo),
  })
}

/**
 * Polling del estado del job. Refetch cada 1s mientras el estado sea
 * intermedio; se detiene cuando queda en Completado/Fallido.
 */
export function useImportStatus(jobId: string | null, opts?: { onFinished?: () => void }) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ["import-status", jobId],
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as ApiResponse<ImportacionJobEstado> | undefined
      const estado = data?.data.estadoTexto
      const terminado = estado === "Completado" || estado === "Fallido" || estado === "CanceladoPorError"
      if (terminado) {
        // Al terminar, invalidamos los listados afectados y disparamos el callback.
        if (estado === "Completado") {
          qc.invalidateQueries({ queryKey: ["sistemas"] })
          qc.invalidateQueries({ queryKey: ["subsistemas"] })
          qc.invalidateQueries({ queryKey: ["elementos"] })
          qc.invalidateQueries({ queryKey: ["ifc"] })
        }
        opts?.onFinished?.()
        return false
      }
      return 1000
    },
    queryFn: async () => {
      const res = await fetch(`/api/import/status/${jobId}`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text.slice(0, 300))
      }
      return (await res.json()) as ApiResponse<ImportacionJobEstado>
    },
  })
}

// Backwards-compat: se referencia en algunos sheets viejos. El nuevo flow
// usa useImportApply + useImportStatus.
export type { ImportResultado }

export function descargarPlantilla() {
  // Anchor programático para forzar download. El proxy ya pone Content-Disposition.
  const a = document.createElement("a")
  a.href = "/api/import/plantilla"
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
