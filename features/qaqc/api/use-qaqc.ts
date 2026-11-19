import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  AgendaItem, AlcanceImportPreview, ApiResponse, Candidatos, ElementoAvance, EstadoPlantilla, ImportPreview, PieDetalle,
  PieEtapaWrite, PieHojaWrite, PieParteWrite, PiePuntoWrite, PieResumen, PieSeccionWrite, PieWrite, ProcedimientoQaqc,
  ProcedimientoQaqcWrite, QaqcAvance,
} from "@/features/qaqc/types"

/**
 * Hooks del módulo QA/QC. Todo cuelga de ["qaqc", …] y cada cambio invalida el árbol
 * entero: una firma mueve el avance, la agenda y la grilla a la vez, y son pocas
 * consultas.
 */

const BASE = "/api/qaqc"
const RAIZ = ["qaqc"] as const

function useInvalidar() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: RAIZ })
}

/** Mutación que invalida todo el módulo al terminar bien. */
function mutacion<TArgs, TRes = unknown>(fn: (a: TArgs) => Promise<TRes>) {
  return () => {
    const invalidar = useInvalidar()
    return useMutation({ mutationFn: fn, onSuccess: invalidar })
  }
}

/** Error de un fetch "a mano" (multipart): mismo criterio que apiClient. */
async function errorDe(res: Response): Promise<Error> {
  const body = await res.json().catch(() => null)
  const lineas = Array.isArray(body?.errors) ? body.errors.flatMap((e: { errors?: string[] }) => e.errors ?? []) : []
  return new Error(lineas.length ? lineas.join("\n") : body?.message ?? res.statusText)
}

async function subir<T>(ruta: string, archivo: File, extra?: Record<string, string>): Promise<T> {
  const fd = new FormData()
  fd.append("archivo", archivo)
  for (const [k, v] of Object.entries(extra ?? {})) fd.append(k, v)
  const res = await fetch(`${BASE}/${ruta}`, { method: "POST", body: fd })
  if (!res.ok) throw await errorDe(res)
  return res.json()
}

/**
 * Descarga un archivo del backend (Excel, PDF del PIE, databook). Va por fetch y no por
 * un <a href> para poder mostrar el error del backend en lugar de bajar un JSON.
 */
export async function descargar(ruta: string, nombrePorDefecto: string) {
  const res = await fetch(`${BASE}/${ruta}`)
  if (!res.ok) throw await errorDe(res)
  const disp = res.headers.get("content-disposition") ?? ""
  const nombre = /filename\*=UTF-8''([^;]+)/i.exec(disp)?.[1] ?? /filename="?([^";]+)"?/i.exec(disp)?.[1]
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre ? decodeURIComponent(nombre) : nombrePorDefecto
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Pide la URL temporal del documento y lo abre en otra pestaña (abierta antes del await para que no la bloqueen). */
export async function abrirDocumento(id: string) {
  const ventana = window.open("", "_blank")
  try {
    const r = await apiClient.get<ApiResponse<string>>(`${BASE}/documentos/${id}/url`)
    if (ventana) ventana.location.href = r.data
    else window.location.href = r.data
  } catch (e) {
    ventana?.close()
    throw e
  }
}

// ── Catálogo de plantillas ────────────────────────────────────────────────

export function usePlantillas(soloVigentes = false) {
  return useQuery({
    queryKey: [...RAIZ, "plantillas", soloVigentes],
    queryFn: async () => (await apiClient.get<ApiResponse<PieResumen[]>>(`${BASE}/plantillas${soloVigentes ? "?vigentes=true" : ""}`)).data,
  })
}

export const useCrearPlantilla = mutacion((d: PieWrite) => apiClient.post<ApiResponse<PieDetalle>>(`${BASE}/plantillas`, d))
export const useEstadoPlantilla = mutacion(({ id, estado }: { id: string; estado: EstadoPlantilla }) =>
  apiClient.post<ApiResponse<PieDetalle>>(`${BASE}/plantillas/${id}/estado`, { estado }))
export const useNuevaRevision = mutacion((id: string) => apiClient.post<ApiResponse<PieDetalle>>(`${BASE}/plantillas/${id}/revision`, {}))
export const useDuplicarPlantilla = mutacion((id: string) => apiClient.post<ApiResponse<PieDetalle>>(`${BASE}/plantillas/${id}/duplicar`, {}))

export function usePreviewImportacion() {
  return useMutation({
    mutationFn: (archivo: File) => subir<ApiResponse<ImportPreview>>("plantillas/importacion/preview", archivo),
  })
}
export const useAplicarImportacion = mutacion((archivo: File) => subir<ApiResponse<PieDetalle>>("plantillas/importacion/aplicar", archivo))

// ── Estructura (plantilla o PIE del proyecto) ─────────────────────────────

export function useArbol(id: string | null) {
  return useQuery({
    queryKey: [...RAIZ, "arbol", id],
    queryFn: async () => (await apiClient.get<ApiResponse<PieDetalle>>(`${BASE}/pies/${id}`)).data,
    enabled: !!id,
  })
}

export const useActualizarPie = mutacion(({ id, ...d }: PieWrite & { id: string }) => apiClient.put<ApiResponse<PieDetalle>>(`${BASE}/pies/${id}`, d))
export const useEliminarPie = mutacion((id: string) => apiClient.delete(`${BASE}/pies/${id}`))

export const useCrearParte = mutacion(({ pieId, ...d }: PieParteWrite & { pieId: string }) => apiClient.post(`${BASE}/pies/${pieId}/partes`, d))
export const useActualizarParte = mutacion(({ id, ...d }: PieParteWrite & { id: string }) => apiClient.put(`${BASE}/partes/${id}`, d))
export const useEliminarParte = mutacion((id: string) => apiClient.delete(`${BASE}/partes/${id}`))

export const useCrearHoja = mutacion(({ pieId, ...d }: PieHojaWrite & { pieId: string }) => apiClient.post(`${BASE}/pies/${pieId}/hojas`, d))
export const useActualizarHoja = mutacion(({ id, ...d }: PieHojaWrite & { id: string }) => apiClient.put(`${BASE}/hojas/${id}`, d))
export const useEliminarHoja = mutacion((id: string) => apiClient.delete(`${BASE}/hojas/${id}`))

export const useCrearEtapa = mutacion((d: PieEtapaWrite) => apiClient.post(`${BASE}/etapas`, d))
export const useActualizarEtapa = mutacion(({ id, ...d }: PieEtapaWrite & { id: string }) => apiClient.put(`${BASE}/etapas/${id}`, d))
export const useEliminarEtapa = mutacion((id: string) => apiClient.delete(`${BASE}/etapas/${id}`))

export const useCrearPunto = mutacion((d: PiePuntoWrite) => apiClient.post(`${BASE}/puntos`, d))
export const useActualizarPunto = mutacion(({ id, ...d }: PiePuntoWrite & { id: string }) => apiClient.put(`${BASE}/puntos/${id}`, d))
export const useEliminarPunto = mutacion((id: string) => apiClient.delete(`${BASE}/puntos/${id}`))

export const useCrearSeccion = mutacion(({ pieId, ...d }: PieSeccionWrite & { pieId: string }) => apiClient.post(`${BASE}/pies/${pieId}/secciones`, d))
export const useActualizarSeccion = mutacion(({ id, ...d }: PieSeccionWrite & { id: string }) => apiClient.put(`${BASE}/secciones/${id}`, d))
export const useEliminarSeccion = mutacion((id: string) => apiClient.delete(`${BASE}/secciones/${id}`))

// ── Procedimientos ────────────────────────────────────────────────────────

export function useProcedimientosQaqc() {
  return useQuery({
    queryKey: [...RAIZ, "procedimientos"],
    queryFn: async () => (await apiClient.get<ApiResponse<ProcedimientoQaqc[]>>(`${BASE}/procedimientos`)).data,
  })
}

export const useActualizarProcedimiento = mutacion(({ id, ...d }: ProcedimientoQaqcWrite & { id: string }) =>
  apiClient.put<ApiResponse<ProcedimientoQaqc>>(`${BASE}/procedimientos/${id}`, d))

/** Todas las planillas de la plataforma, para asignarlas a puntos y a anexos. */
export function usePlanillasCatalogo() {
  return useQuery({
    queryKey: [...RAIZ, "planillas-catalogo"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: { id: string; codigo: string | null; nombre: string }[] }>("/api/planillas")
      return (r.data ?? []).map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre }))
        .sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? ""))
    },
    staleTime: 5 * 60_000,
  })
}

// ── PIE del proyecto ──────────────────────────────────────────────────────

export function usePiesProyecto() {
  return useQuery({
    queryKey: [...RAIZ, "proyecto", "pies"],
    queryFn: async () => (await apiClient.get<ApiResponse<PieResumen[]>>(`${BASE}/proyecto/pies`)).data,
  })
}

export const useInstanciar = mutacion((plantillaId: string) => apiClient.post<ApiResponse<PieDetalle>>(`${BASE}/proyecto/pies`, { plantillaId }))

export function useEjecucion(id: string | null) {
  return useQuery({
    queryKey: [...RAIZ, "ejecucion", id],
    queryFn: async () => (await apiClient.get<ApiResponse<PieDetalle>>(`${BASE}/proyecto/pies/${id}/ejecucion`)).data,
    enabled: !!id,
  })
}

export function useAvance() {
  return useQuery({
    queryKey: [...RAIZ, "avance"],
    queryFn: async () => (await apiClient.get<ApiResponse<QaqcAvance>>(`${BASE}/proyecto/avance`)).data,
  })
}

export function useAgenda() {
  return useQuery({
    queryKey: [...RAIZ, "agenda"],
    queryFn: async () => (await apiClient.get<ApiResponse<AgendaItem[]>>(`${BASE}/proyecto/agenda`)).data,
  })
}

// ── Ejecución de puntos ───────────────────────────────────────────────────

export const useCrearRegistro = mutacion(({ puntoId, planillaId, itemIds }: { puntoId: string; planillaId: string; itemIds?: string[] }) =>
  apiClient.post<ApiResponse<{ registroId: string }>>(`${BASE}/puntos/${puntoId}/registros`, { planillaId, itemIds: itemIds ?? [] }))

// ── Alcance de los puntos por elemento o por grupo ────────────────────────

export function useCandidatos(puntoId: string | null, buscar: string, tipo: string) {
  return useQuery({
    queryKey: [...RAIZ, "candidatos", puntoId, buscar, tipo],
    queryFn: async () => {
      const q = new URLSearchParams({ max: "300" })
      if (buscar.trim()) q.set("buscar", buscar.trim())
      if (tipo) q.set("tipo", tipo)
      return (await apiClient.get<ApiResponse<Candidatos>>(`${BASE}/puntos/${puntoId}/candidatos?${q}`)).data
    },
    enabled: !!puntoId,
  })
}

export const useAgregarItems = mutacion(({ puntoId, elementoIds, testGroupIds }: { puntoId: string; elementoIds?: string[]; testGroupIds?: string[] }) =>
  apiClient.post<ApiResponse<{ agregados: number; yaEstaban: number }>>(`${BASE}/puntos/${puntoId}/items`, { elementoIds: elementoIds ?? [], testGroupIds: testGroupIds ?? [] }))

export const useQuitarItem = mutacion((id: string) => apiClient.delete(`${BASE}/items/${id}`))

export const useItemNoAplica = mutacion(({ id, motivo }: { id: string; motivo: string }) =>
  apiClient.post(`${BASE}/items/${id}/no-aplica`, { motivo }))

export const useItemQuitarNoAplica = mutacion((id: string) => apiClient.delete(`${BASE}/items/${id}/no-aplica`))

export function useAvanceElementos(pieId: string | null) {
  return useQuery({
    queryKey: [...RAIZ, "elementos", pieId],
    queryFn: async () => (await apiClient.get<ApiResponse<ElementoAvance[]>>(`${BASE}/proyecto/elementos${pieId ? `?pieId=${pieId}` : ""}`)).data,
  })
}

export function usePreviewAlcance() {
  return useMutation({
    mutationFn: ({ pieId, archivo }: { pieId: string; archivo: File }) =>
      subir<ApiResponse<AlcanceImportPreview>>(`proyecto/pies/${pieId}/alcance/preview`, archivo),
  })
}

export const useAplicarAlcance = mutacion(({ pieId, archivo }: { pieId: string; archivo: File }) =>
  subir<ApiResponse<AlcanceImportPreview>>(`proyecto/pies/${pieId}/alcance/aplicar`, archivo))

export const useSubirDocumentoPunto = mutacion(({ puntoId, archivo, nombre }: { puntoId: string; archivo: File; nombre?: string }) =>
  subir(`puntos/${puntoId}/documentos`, archivo, nombre ? { nombre } : undefined))

export const useSubirDocumentoSeccion = mutacion(({ seccionId, archivo, nombre }: { seccionId: string; archivo: File; nombre?: string }) =>
  subir(`secciones/${seccionId}/documentos`, archivo, nombre ? { nombre } : undefined))

export const useEliminarDocumento = mutacion((id: string) => apiClient.delete(`${BASE}/documentos/${id}`))

export const useFirmarPunto = mutacion(({ puntoId, parteId, comentario }: { puntoId: string; parteId: string; comentario?: string }) =>
  apiClient.post(`${BASE}/puntos/${puntoId}/firmar`, { parteId, comentario }))

export const useFirmarHoja = mutacion(({ hojaId, parteId, comentario }: { hojaId: string; parteId: string; comentario?: string }) =>
  apiClient.post(`${BASE}/hojas/${hojaId}/firmar`, { parteId, comentario }))

export const useNoAplica = mutacion(({ puntoId, motivo }: { puntoId: string; motivo: string }) =>
  apiClient.post(`${BASE}/puntos/${puntoId}/no-aplica`, { motivo }))

export const useQuitarNoAplica = mutacion((puntoId: string) => apiClient.delete(`${BASE}/puntos/${puntoId}/no-aplica`))

export const useAnularFirma = mutacion(({ id, motivo }: { id: string; motivo: string }) =>
  apiClient.post(`${BASE}/firmas/${id}/anular`, { motivo }))
