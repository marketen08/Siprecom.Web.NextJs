import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

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

import { useQueryClient } from "@tanstack/react-query"

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

export function useImportPlanillasAllApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, omitirExistentes }: { data: unknown; omitirExistentes: boolean }) =>
      apiClient.post<ApiResponse<PlanillasBulkImportResultado>>(
        `/api/planillas/import-all${omitirExistentes ? "?omitirExistentes=true" : ""}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
