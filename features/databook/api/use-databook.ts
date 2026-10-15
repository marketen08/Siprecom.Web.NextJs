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
 * Descarga el PDF. Pide la SAS URL al backend (que ya viene con header
 * Content-Disposition: attachment incrustado) y dispara la descarga.
 * El browser baja directo desde Azure Blob sin pasar por el proxy.
 *
 * target=_blank: el atributo download del anchor NO funciona cuando la URL
 * es cross-origin (Azure). Como el backend ya fuerza Content-Disposition,
 * en navegadores modernos el download arranca solo. _blank es defense in
 * depth — si por algún motivo el header no se respeta, el PDF abre en una
 * nueva pestaña en lugar de reemplazar la actual.
 */
export async function descargarDatabook(jobId: string): Promise<void> {
  const resp = await apiClient.get<DatabookDescargaResponse>(
    `/api/databooks/jobs/${jobId}/descargar`,
  )
  if (!resp?.url) throw new Error("El backend no devolvió URL de descarga")

  const a = document.createElement("a")
  a.href = resp.url
  a.download = resp.fileName ?? "databook.pdf"
  a.target = "_blank"
  a.rel = "noopener noreferrer"
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
