"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  DatabookDescargaResponse,
  DatabookJob,
  DatabookSolicitudInput,
  DatabookSolicitudResponse,
} from "../types"
import { EstadoDatabookJob } from "../types"

const QK_LIST   = ["databooks", "jobs"] as const
const QK_DETAIL = (jobId: string) => ["databooks", "jobs", jobId] as const

/** POST /api/databooks — encola un job de generación. */
export function useSolicitarDatabook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DatabookSolicitudInput) =>
      apiClient.post<DatabookSolicitudResponse>("/api/databooks", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_LIST })
    },
  })
}

/**
 * GET /api/databooks/jobs — listado. Hace polling cada 5s mientras haya
 * jobs en PENDIENTE o EN_PROCESO para reflejar el avance en tiempo real.
 * Cuando todos los jobs visibles están en estado terminal (COMPLETADO/ERROR),
 * el polling se detiene automáticamente.
 */
export function useGetDatabookJobs() {
  return useQuery<DatabookJob[]>({
    queryKey: QK_LIST,
    queryFn: () => apiClient.get<DatabookJob[]>("/api/databooks/jobs"),
    refetchInterval: (q) => {
      const data = q.state.data as DatabookJob[] | undefined
      if (!data || data.length === 0) return false
      const hayActivos = data.some(
        (j) =>
          j.estado === EstadoDatabookJob.PENDIENTE ||
          j.estado === EstadoDatabookJob.EN_PROCESO,
      )
      return hayActivos ? 5000 : false
    },
    refetchOnWindowFocus: true,
  })
}

/**
 * GET /api/databooks/jobs/{jobId} — un job puntual con polling 3s mientras
 * esté activo. Útil cuando el user se queda mirando un job recién encolado.
 */
export function useGetDatabookJob(jobId: string | null) {
  return useQuery<DatabookJob>({
    queryKey: QK_DETAIL(jobId ?? ""),
    enabled: !!jobId,
    queryFn: () => apiClient.get<DatabookJob>(`/api/databooks/jobs/${jobId}`),
    refetchInterval: (q) => {
      const data = q.state.data as DatabookJob | undefined
      if (!data) return 3000
      return data.estado === EstadoDatabookJob.PENDIENTE ||
        data.estado === EstadoDatabookJob.EN_PROCESO
        ? 3000
        : false
    },
  })
}

/**
 * Descarga el PDF. Pide la SAS URL al backend y dispara la descarga del browser
 * usando un anchor temporal — el browser baja directo desde Azure Blob sin
 * pasar por nuestro proxy (más rápido para PDFs grandes).
 */
export async function descargarDatabook(jobId: string): Promise<void> {
  const resp = await apiClient.get<DatabookDescargaResponse>(
    `/api/databooks/jobs/${jobId}/descargar`,
  )
  if (!resp?.url) throw new Error("El backend no devolvió URL de descarga")

  const a = document.createElement("a")
  a.href = resp.url
  a.download = resp.fileName ?? "databook.pdf"
  // Sin target=_blank: queremos que la descarga arranque en la misma pestaña
  // para que el SAS sea consumido inmediatamente sin pop-up blocker.
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** DELETE /api/databooks/jobs/{jobId} */
export function useEliminarDatabook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => apiClient.delete(`/api/databooks/jobs/${jobId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_LIST })
    },
  })
}
