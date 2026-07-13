import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export interface PlanillasReferencias {
  tareasCount: number
  registrosCount: number
  hayReferencias: boolean
}

/** Cuántas Tareas/Registros usan planillas. Para deshabilitar los modos destructivos del import. */
export function usePlanillasReferencias() {
  return useQuery({
    queryKey: ["planillas", "uso-referencias"],
    queryFn: () => apiClient.get<PlanillasReferencias>("/api/planillas/uso-referencias"),
  })
}

// ─── LIMPIEZA DE PLANILLAS NO USADAS ────────────────────────────────────────

export interface PlanillaNoUsada {
  id: string
  codigo: string
  version: string
  nombre: string
}

export interface PlanillasNoUsadasPreview {
  planillas: PlanillaNoUsada[]
  camposHuerfanosCount: number
}

/**
 * Planillas sin referencias (ni Tarea ni Registro) + cuántos Campos quedarían
 * huérfanos al eliminarlas. SuperAdmin. Preview idempotente.
 */
export function usePlanillasNoUsadasPreview() {
  return useQuery({
    queryKey: ["planillas", "no-usadas", "preview"],
    queryFn: () => apiClient.get<PlanillasNoUsadasPreview>("/api/planillas/no-usadas/preview"),
  })
}

export interface PlanillasNoUsadasEliminarResultado {
  planillasEliminadas: number
  camposEliminados: number
}

/** Aplica la limpieza: hard-delete planillas no referenciadas + campos huérfanos. */
export function useEliminarPlanillasNoUsadas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<PlanillasNoUsadasEliminarResultado>("/api/planillas/no-usadas/eliminar", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

// ─── RESTAURAR PLANILLAS SOFT-DELETED ───────────────────────────────────────

export interface PlanillaEliminada {
  id: string
  codigo: string
  version: string
  nombre: string
  updatedAt: string
  updatedByNombre: string | null
}

/** Lista todas las planillas soft-deleted, cross-tenant. SuperAdmin. */
export function usePlanillasEliminadas() {
  return useQuery({
    queryKey: ["planillas", "eliminadas"],
    queryFn: () => apiClient.get<PlanillaEliminada[]>("/api/planillas/eliminadas"),
  })
}

/** Restaura una planilla soft-deleted (IsActive=true). */
export function useReactivarPlanilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<{ message: string; id: string }>(`/api/planillas/${id}/reactivar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

export interface PlanillaImportPreview {
  codigoOriginal: string
  codigoAplicar: string
  versionOriginal: string
  versionAplicar: string
  nombre: string
  seccionesACrear: number
  camposNuevos: number
  camposReusados: number
  planillaCamposACrear: number
  /** True si ya existe una planilla con el mismo Codigo+Version. */
  yaExiste?: boolean
  conflictos: Array<{
    tipo: string
    mensaje: string
    severidad: "error" | "warning"
  }>
  esAplicable: boolean
}

export interface PlanillaImportResultado {
  aplicado: boolean
  /** True si se salteó por ya existir (no es un error). */
  omitida?: boolean
  planillaIdCreada: string | null
  preview: PlanillaImportPreview
  mensaje: string
}

/** Descarga el JSON exportado de una planilla, vía anchor programático. */
export function exportarPlanilla(planillaId: string) {
  const a = document.createElement("a")
  a.href = `/api/planillas/${planillaId}/export`
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** Lee un File JSON y lo parsea. Lanza Error si el archivo no es válido. */
export async function parseFileJson<T>(file: File): Promise<T> {
  const text = await file.text()
  try {
    return JSON.parse(text) as T
  } catch (e) {
    throw new Error("El archivo no es un JSON válido.")
  }
}

export function useImportPlanillaPreview() {
  return useMutation({
    mutationFn: (data: unknown) =>
      apiClient.post<ApiResponse<PlanillaImportPreview>>("/api/planillas/import/preview", data),
  })
}

export function useImportPlanillaApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) =>
      apiClient.post<ApiResponse<PlanillaImportResultado>>("/api/planillas/import", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

// ─── MASIVO (todas las planillas) ───────────────────────────────────────────

export interface PlanillasBulkImportPreview {
  totalPlanillas: number
  planillas: PlanillaImportPreview[]
  esAplicable: boolean
}

export interface PlanillasBulkImportResultado {
  aplicado: boolean
  importadas: number
  omitidas: number
  total: number
  resultados: PlanillaImportResultado[]
  mensaje: string
}

/** Descarga el JSON con TODAS las planillas (SuperAdmin), vía anchor programático. */
export function exportarTodasLasPlanillas() {
  const a = document.createElement("a")
  a.href = `/api/planillas/export-all`
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function useImportPlanillasAllPreview() {
  return useMutation({
    mutationFn: (data: unknown) =>
      apiClient.post<ApiResponse<PlanillasBulkImportPreview>>("/api/planillas/import-all/preview", data),
  })
}

/** Modo del import masivo. */
export type ImportModo = "crear" | "omitir" | "reemplazar" | "eliminar-todas"

export function useImportPlanillasAllApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, modo }: { data: unknown; modo: ImportModo }) =>
      apiClient.post<ApiResponse<PlanillasBulkImportResultado>>(
        `/api/planillas/import-all?modo=${encodeURIComponent(modo)}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
