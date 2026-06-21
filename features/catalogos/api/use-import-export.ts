import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export type CatalogoModo = "omitir" | "reemplazar"

export interface CatalogosBulkImportPreview {
  especialidadesTotal: number
  especialidadesYaExisten: number
  tiposTotal: number
  tiposYaExisten: number
  conflictos: string[]
  esAplicable: boolean
}

export interface CatalogosBulkImportResultado {
  aplicado: boolean
  especialidadesCreadas: number
  especialidadesReemplazadas: number
  especialidadesOmitidas: number
  tiposCreados: number
  tiposReemplazados: number
  tiposOmitidos: number
  errores: string[]
  mensaje: string
}

export function exportarCatalogos() {
  const a = document.createElement("a")
  a.href = `/api/catalogos/export-all`
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

export function useImportCatalogosPreview() {
  return useMutation({
    mutationFn: (data: unknown) =>
      apiClient.post<ApiResponse<CatalogosBulkImportPreview>>("/api/catalogos/import-all/preview", data),
  })
}

export function useImportCatalogosApply() {
  return useMutation({
    mutationFn: ({ data, modo }: { data: unknown; modo: CatalogoModo }) =>
      apiClient.post<ApiResponse<CatalogosBulkImportResultado>>(
        `/api/catalogos/import-all?modo=${encodeURIComponent(modo)}`,
        data,
      ),
  })
}
