import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/soldadura/types"
import type {
  ArmarLotes, Configuracion, Control, ControlWrite, Ensayo, Historial, Informe, InformeWrite, Lote,
  ReparacionWrite, ResultadoCarga, Solicitud, SolicitudWrite, TasaReparacion, Visual,
} from "@/features/soldadura/types-inspeccion"

/**
 * Hooks de la Fase 2. Casi todo cambio de inspección mueve el estado de las juntas,
 * los lotes, los ensayos pendientes y la tasa de reparación al mismo tiempo, así que
 * las mutaciones invalidan todo lo que cuelga de "soldadura": es barato y evita que
 * una pantalla quede mostrando un estado viejo.
 */

const BASE = "/api/soldadura"

function useInvalidarTodo() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: ["soldadura"] })
}

function mutacion<TIn, TOut>(fn: (data: TIn) => Promise<TOut>) {
  return function useMutacion() {
    const invalidar = useInvalidarTodo()
    return useMutation({ mutationFn: fn, onSuccess: invalidar })
  }
}

// ─── Inspección visual, reparación, historial, controles ───────────────

export const useVisual = mutacion(async (data: Visual) =>
  (await apiClient.post<ApiResponse<ResultadoCarga>>(`${BASE}/visual`, data)).data)

export const useReparacion = mutacion(async ({ juntaId, ...data }: ReparacionWrite & { juntaId: string }) =>
  (await apiClient.post<ApiResponse<Historial>>(`${BASE}/juntas/${juntaId}/reparaciones`, data)).data)

export function useHistorial(juntaId: string | null) {
  return useQuery({
    queryKey: ["soldadura", "historial", juntaId],
    enabled: !!juntaId,
    queryFn: async () => (await apiClient.get<ApiResponse<Historial>>(`${BASE}/juntas/${juntaId}/historial`)).data,
  })
}

export const useControl = mutacion(async ({ juntaId, ...data }: ControlWrite & { juntaId: string }) =>
  (await apiClient.post<ApiResponse<Control>>(`${BASE}/juntas/${juntaId}/controles`, data)))

export const useEliminarControl = mutacion((id: string) => apiClient.delete(`${BASE}/controles/${id}`))

// ─── Lotes ─────────────────────────────────────────────────────────────

export function useLotes() {
  return useQuery({
    queryKey: ["soldadura", "lotes"],
    queryFn: async () => (await apiClient.get<ApiResponse<Lote[]>>(`${BASE}/lotes`)).data,
  })
}

export function useLote(id: string | null) {
  return useQuery({
    queryKey: ["soldadura", "lotes", id],
    enabled: !!id,
    queryFn: async () => (await apiClient.get<ApiResponse<Lote>>(`${BASE}/lotes/${id}`)).data,
  })
}

export const useArmarLotes = mutacion(async (data: ArmarLotes) =>
  (await apiClient.post<ApiResponse<Lote[]>>(`${BASE}/lotes/armar`, data)))

// ─── Ensayos, solicitudes e informes ──────────────────────────────────

export function usePendientes() {
  return useQuery({
    queryKey: ["soldadura", "ensayos", "pendientes"],
    queryFn: async () => (await apiClient.get<ApiResponse<Ensayo[]>>(`${BASE}/ensayos/pendientes`)).data,
  })
}

export function useSolicitudes() {
  return useQuery({
    queryKey: ["soldadura", "solicitudes"],
    queryFn: async () => (await apiClient.get<ApiResponse<Solicitud[]>>(`${BASE}/solicitudes`)).data,
  })
}

export const useCrearSolicitud = mutacion(async (data: SolicitudWrite) =>
  (await apiClient.post<ApiResponse<Solicitud>>(`${BASE}/solicitudes`, data)))

export function useInformes() {
  return useQuery({
    queryKey: ["soldadura", "informes"],
    queryFn: async () => (await apiClient.get<ApiResponse<Informe[]>>(`${BASE}/informes`)).data,
  })
}

export const useCrearInforme = mutacion(async (data: InformeWrite) =>
  (await apiClient.post<ApiResponse<ResultadoCarga>>(`${BASE}/informes`, data)).data)

// ─── Tasa de reparación y configuración ───────────────────────────────

export function useTasaReparacion() {
  return useQuery({
    queryKey: ["soldadura", "tasa-reparacion"],
    queryFn: async () => (await apiClient.get<ApiResponse<TasaReparacion[]>>(`${BASE}/tasa-reparacion`)).data,
  })
}

export function useConfiguracion() {
  return useQuery({
    queryKey: ["soldadura", "configuracion"],
    queryFn: async () => (await apiClient.get<ApiResponse<Configuracion>>(`${BASE}/configuracion`)).data,
  })
}

export const useGuardarConfiguracion = mutacion(async (data: Configuracion) =>
  (await apiClient.put<ApiResponse<Configuracion>>(`${BASE}/configuracion`, data)).data)

// ─── Descargas de registros ────────────────────────────────────────────

export function descargar(ruta: string) {
  const a = document.createElement("a")
  a.href = `${BASE}/${ruta}`
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
