import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  ApiResponse, Clase, ClaseWrite, ConsultaMatriz, FilaMatriz, ImportPreview, ImportResultado,
  MatrizWrite, Norma, NormaWrite, PersonalEnd, PersonalEndWrite, Pqr, PqrWrite, ResultadoMatriz,
  Soldador, SoldadorWrite, CalificacionWrite, TipoArchivo, Vencimientos, Wps, WpsWrite,
} from "@/features/soldadura/types"

/**
 * Hooks del módulo de Calidad de Soldadura. Todo pasa por el proxy `/api/soldadura`,
 * que reenvía al backend sobre el proyecto activo del usuario.
 *
 * Las claves de query cuelgan de `["soldadura", …]` y cada mutación invalida lo que
 * su cambio puede mover en otras pantallas: borrar una fila de la matriz cambia el
 * `enUso` de su clase y de su WPS, una calificación nueva cambia el tablero de
 * vencimientos. Invalidar de más es barato; dejar una pantalla mintiendo, no.
 */

const BASE = "/api/soldadura"
const K = {
  normas: ["soldadura", "normas"] as const,
  clases: ["soldadura", "clases"] as const,
  matriz: ["soldadura", "matriz"] as const,
  wps: ["soldadura", "wps"] as const,
  pqr: ["soldadura", "pqr"] as const,
  soldadores: ["soldadura", "soldadores"] as const,
  personalEnd: ["soldadura", "personal-end"] as const,
  vencimientos: ["soldadura", "vencimientos"] as const,
}

function useInvalidar(...claves: (readonly string[])[]) {
  const qc = useQueryClient()
  return () => claves.forEach((k) => void qc.invalidateQueries({ queryKey: k }))
}

/** ABM completo de un recurso: listado, alta, edición y baja con sus invalidaciones. */
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
        mutationFn: ({ id, ...data }: TWrite & { id: string }) =>
          apiClient.put<ApiResponse<TDto>>(`${BASE}/${ruta}/${id}`, data),
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

// ─── Normas, clases, matriz ─────────────────────────────────────────────

export const normas = crud<Norma, NormaWrite>("normas", K.normas, [K.clases, K.vencimientos, K.soldadores])
export const clases = crud<Clase, ClaseWrite>("clases", K.clases, [K.normas, K.matriz])
export const matriz = crud<FilaMatriz, MatrizWrite>("matriz", K.matriz, [K.clases, K.wps])

export function useCargarNormasBase() {
  const invalidar = useInvalidar(K.normas, K.vencimientos, K.soldadores)
  return useMutation({
    mutationFn: () => apiClient.post<ApiResponse<Norma[]>>(`${BASE}/normas/base`, {}),
    onSuccess: invalidar,
  })
}

export function useResolverMatriz() {
  return useMutation({
    mutationFn: async (consulta: ConsultaMatriz) =>
      (await apiClient.post<ApiResponse<ResultadoMatriz>>(`${BASE}/matriz/resolver`, consulta)).data,
  })
}

// ─── WPS y PQR ──────────────────────────────────────────────────────────

export const wps = crud<Wps, WpsWrite>("wps", K.wps, [K.pqr, K.matriz])
export const pqr = crud<Pqr, PqrWrite>("pqr", K.pqr, [K.wps])

// ─── Soldadores y calificaciones ────────────────────────────────────────

export const soldadores = crud<Soldador, SoldadorWrite>("soldadores", K.soldadores, [K.vencimientos])

export function useCreateCalificacion() {
  const invalidar = useInvalidar(K.soldadores, K.vencimientos)
  return useMutation({
    mutationFn: ({ habilitacionId, ...data }: CalificacionWrite & { habilitacionId: string }) =>
      apiClient.post(`${BASE}/soldadores/${habilitacionId}/calificaciones`, data),
    onSuccess: invalidar,
  })
}

export function useUpdateCalificacion() {
  const invalidar = useInvalidar(K.soldadores, K.vencimientos)
  return useMutation({
    mutationFn: ({ id, ...data }: CalificacionWrite & { id: string }) =>
      apiClient.put(`${BASE}/calificaciones/${id}`, data),
    onSuccess: invalidar,
  })
}

export function useDeleteCalificacion() {
  const invalidar = useInvalidar(K.soldadores, K.vencimientos)
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${BASE}/calificaciones/${id}`),
    onSuccess: invalidar,
  })
}

// ─── Personal de END y vencimientos ─────────────────────────────────────

export const personalEnd = crud<PersonalEnd, PersonalEndWrite>("personal-end", K.personalEnd, [K.vencimientos])

export function useVencimientos(dias: number) {
  return useQuery({
    queryKey: [...K.vencimientos, dias],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<Vencimientos>>(`${BASE}/vencimientos`, { dias })).data,
  })
}

// ─── Archivos ───────────────────────────────────────────────────────────

/** Lo que cambia `tieneArchivo` en cada tipo de registro. */
const CLAVE_DE_TIPO: Record<TipoArchivo, readonly string[]> = {
  Wps: K.wps,
  Pqr: K.pqr,
  Calificacion: K.soldadores,
  PersonalEnd: K.personalEnd,
}

/** Lee el error de una respuesta de fetch crudo con el mismo criterio que apiClient. */
async function errorDe(res: Response): Promise<Error> {
  const body = await res.json().catch(() => null)
  const lineas = Array.isArray(body?.errors)
    ? body.errors.flatMap((e: { errors?: string[] }) => e.errors ?? [])
    : []
  return new Error(lineas.length ? lineas.join("\n") : (body?.message ?? `Error ${res.status}`))
}

export function useSubirArchivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tipo, id, archivo }: { tipo: TipoArchivo; id: string; archivo: File }) => {
      const fd = new FormData()
      fd.append("archivo", archivo)
      const res = await fetch(`${BASE}/archivos/${tipo}/${id}`, { method: "POST", body: fd })
      if (!res.ok) throw await errorDe(res)
      return res.json()
    },
    onSuccess: (_d, v) => void qc.invalidateQueries({ queryKey: CLAVE_DE_TIPO[v.tipo] }),
  })
}

/** Pide la URL temporal del PDF y lo abre en otra pestaña. */
export async function abrirArchivo(tipo: TipoArchivo, id: string) {
  // La pestaña se abre antes del await: si se abre después, el navegador la toma
  // como popup no pedido y la bloquea.
  const ventana = window.open("", "_blank")
  try {
    const r = await apiClient.get<ApiResponse<string>>(`${BASE}/archivos/${tipo}/${id}`)
    if (ventana) ventana.location.href = r.data
    else window.location.href = r.data
  } catch (e) {
    ventana?.close()
    throw e
  }
}

// ─── Importación ────────────────────────────────────────────────────────

async function postExcel<T>(ruta: string, archivo: File): Promise<T> {
  const fd = new FormData()
  fd.append("archivo", archivo)
  const res = await fetch(`${BASE}/importacion/${ruta}`, { method: "POST", body: fd })
  const json = await res.json().catch(() => null)
  // Apply devuelve 400 con el resultado cuando el archivo tiene errores: no es una
  // falla del pedido, es la respuesta. Se devuelve igual para mostrar los errores.
  if (json?.data) return json.data as T
  if (!res.ok) throw new Error(json?.message ?? `Error ${res.status}`)
  return json as T
}

export function useImportPreview() {
  return useMutation({ mutationFn: (archivo: File) => postExcel<ImportPreview>("preview", archivo) })
}

export function useImportApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) => postExcel<ImportResultado>("apply", archivo),
    onSuccess: (r) => {
      if (r.aplicado) void qc.invalidateQueries({ queryKey: ["soldadura"] })
    },
  })
}

export function descargarPlantilla() {
  const a = document.createElement("a")
  a.href = `${BASE}/importacion/plantilla`
  a.download = "soldadura-catalogos.xlsx"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
