import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export type ProcedimientoModo = "omitir" | "reemplazar"

export interface ProcedimientosBulkImportPreview {
  total: number
  procedimientos: Array<{ nombre: string; yaExiste: boolean; tieneArchivo: boolean }>
}

export interface ProcedimientoImportItemResultado {
  nombre: string
  aplicado: boolean
  omitido: boolean
  accion: string
  mensaje: string
}

export interface ProcedimientosBulkImportResultado {
  aplicado: boolean
  creados: number
  reemplazados: number
  omitidos: number
  total: number
  resultados: ProcedimientoImportItemResultado[]
  mensaje: string
}

/** Descarga el JSON con todos los procedimientos (SuperAdmin). */
export function exportarTodosLosProcedimientos() {
  const a = document.createElement("a")
  a.href = `/api/procedimientos/export-all`
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function parseFileJson<T>(file: File): Promise<T> {
  const text = await file.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error("El archivo no es un JSON válido.")
  }
}

export function useImportProcedimientosPreview() {
  return useMutation({
    mutationFn: (data: unknown) =>
      apiClient.post<ApiResponse<ProcedimientosBulkImportPreview>>("/api/procedimientos/import-all/preview", data),
  })
}

export function useImportProcedimientosApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, modo }: { data: unknown; modo: ProcedimientoModo }) =>
      apiClient.post<ApiResponse<ProcedimientosBulkImportResultado>>(
        `/api/procedimientos/import-all?modo=${encodeURIComponent(modo)}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedimientos"] })
    },
  })
}
