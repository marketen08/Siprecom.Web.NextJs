import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, ImportPreview, ImportResultado } from "@/features/soldadura/types"
import type {
  Habilitacion, Junta, JuntaWrite, Linea, LineaWrite, Lote, LoteWrite, Pieza, PiezaWrite, ValidarSoldador,
} from "@/features/soldadura/types-juntas"

/**
 * Hooks de la Fase 1: líneas, piezas, lotes de aporte, juntas, validación del
 * soldador, trazabilidad e importación de juntas. Mismo proxy y mismo criterio de
 * invalidación que `use-soldadura.ts`: guardar una junta mueve los contadores de su
 * línea, el uso de los lotes y —porque soldar mantiene viva la calificación— el tablero
 * de vencimientos y la lista de soldadores.
 */

const BASE = "/api/soldadura"
const K = {
  lineas: ["soldadura", "lineas"] as const,
  piezas: ["soldadura", "piezas"] as const,
  lotes: ["soldadura", "consumibles"] as const,
  juntas: ["soldadura", "juntas"] as const,
  vencimientos: ["soldadura", "vencimientos"] as const,
  soldadores: ["soldadura", "soldadores"] as const,
}

function useInvalidar(...claves: (readonly string[])[]) {
  const qc = useQueryClient()
  return () => claves.forEach((k) => void qc.invalidateQueries({ queryKey: k }))
}

function crud<TDto, TWrite>(ruta: string, clave: readonly string[], afecta: (readonly string[])[] = []) {
  return {
    useList: () =>
      useQuery({
        queryKey: clave,
        queryFn: async () => (await apiClient.get<ApiResponse<TDto[]>>(`${BASE}/${ruta}`)).data,
      }),
    useCreate: () => {
      const invalidar = useInvalidar(clave, ...afecta)
      return useMutation({
        mutationFn: (data: TWrite) => apiClient.post<ApiResponse<TDto>>(`${BASE}/${ruta}`, data),
        onSuccess: invalidar,
      })
    },
    useUpdate: () => {
      const invalidar = useInvalidar(clave, ...afecta)
      return useMutation({
        mutationFn: ({ id, ...data }: TWrite & { id: string }) => apiClient.put<ApiResponse<TDto>>(`${BASE}/${ruta}/${id}`, data),
        onSuccess: invalidar,
      })
    },
    useDelete: () => {
      const invalidar = useInvalidar(clave, ...afecta)
      return useMutation({
        mutationFn: (id: string) => apiClient.delete(`${BASE}/${ruta}/${id}`),
        onSuccess: invalidar,
      })
    },
  }
}

export const lineas = crud<Linea, LineaWrite>("lineas", K.lineas, [K.juntas])
export const piezas = crud<Pieza, PiezaWrite>("piezas", K.piezas, [K.juntas])
export const lotes = crud<Lote, LoteWrite>("consumibles", K.lotes, [K.juntas])

const AFECTA_JUNTA = [K.lineas, K.lotes, K.piezas, K.vencimientos, K.soldadores]

export function useJuntas(lineaId: string | null) {
  return useQuery({
    queryKey: [...K.juntas, lineaId ?? "todas"],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<Junta[]>>(`${BASE}/juntas`, lineaId ? { lineaId } : undefined)).data,
  })
}

export function useCreateJunta() {
  const invalidar = useInvalidar(K.juntas, ...AFECTA_JUNTA)
  return useMutation({
    mutationFn: (data: JuntaWrite) => apiClient.post<ApiResponse<Junta>>(`${BASE}/juntas`, data),
    onSuccess: invalidar,
  })
}

export function useUpdateJunta() {
  const invalidar = useInvalidar(K.juntas, ...AFECTA_JUNTA)
  return useMutation({
    mutationFn: ({ id, ...data }: JuntaWrite & { id: string }) => apiClient.put<ApiResponse<Junta>>(`${BASE}/juntas/${id}`, data),
    onSuccess: invalidar,
  })
}

export function useDeleteJunta() {
  const invalidar = useInvalidar(K.juntas, ...AFECTA_JUNTA)
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${BASE}/juntas/${id}`),
    onSuccess: invalidar,
  })
}

export function useValidarSoldador() {
  return useMutation({
    mutationFn: async (data: ValidarSoldador) =>
      (await apiClient.post<ApiResponse<Habilitacion>>(`${BASE}/juntas/validar-soldador`, data)).data,
  })
}

/** Descarga el registro de trazabilidad de la línea. */
export function descargarTrazabilidad(lineaId: string) {
  const a = document.createElement("a")
  a.href = `${BASE}/lineas/${lineaId}/trazabilidad`
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ─── Importación de juntas ──────────────────────────────────────────────

async function postExcel<T>(ruta: string, archivo: File): Promise<T> {
  const fd = new FormData()
  fd.append("archivo", archivo)
  const res = await fetch(`${BASE}/importacion-juntas/${ruta}`, { method: "POST", body: fd })
  const json = await res.json().catch(() => null)
  if (json?.data) return json.data as T
  if (!res.ok) throw new Error(json?.message ?? `Error ${res.status}`)
  return json as T
}

export function useImportJuntasPreview() {
  return useMutation({ mutationFn: (archivo: File) => postExcel<ImportPreview>("preview", archivo) })
}

export function useImportJuntasApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) => postExcel<ImportResultado>("apply", archivo),
    onSuccess: (r) => { if (r.aplicado) void qc.invalidateQueries({ queryKey: ["soldadura"] }) },
  })
}

export function descargarPlantillaJuntas() {
  const a = document.createElement("a")
  a.href = `${BASE}/importacion-juntas/plantilla`
  a.download = "soldadura-juntas.xlsx"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
