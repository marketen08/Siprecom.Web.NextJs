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

/**
 * Descarga el JSON con los procedimientos (SuperAdmin).
 *
 * @param equipoOrigen Acota el export al catálogo de un equipo; `"__none__"` son los
 *   globales. Vacío = todos. El equipo elegido NO viaja en el archivo: lo que viaja es si
 *   cada procedimiento era global, y el equipo destino lo elige quien importa.
 */
export function exportarTodosLosProcedimientos(equipoOrigen?: string) {
  const a = document.createElement("a")
  a.href = equipoOrigen
    ? `/api/procedimientos/export-all?equipoOrigen=${encodeURIComponent(equipoOrigen)}`
    : `/api/procedimientos/export-all`
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
    mutationFn: ({ data, modo, equipoDestino }: {
      data: unknown
      modo: ProcedimientoModo
      /** Equipo al que aterriza lo que en el origen era de un equipo. */
      equipoDestino?: string
    }) => {
      const qs = new URLSearchParams({ modo })
      if (equipoDestino) qs.set("equipoDestino", equipoDestino)
      return apiClient.post<ApiResponse<ProcedimientosBulkImportResultado>>(
        `/api/procedimientos/import-all?${qs}`,
        data,
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedimientos"] })
    },
  })
}
