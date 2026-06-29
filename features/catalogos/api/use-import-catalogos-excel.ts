import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ImportEntidadResumen, ImportError } from "@/features/importacion/types"

export interface ImportCatalogosPreview {
  especialidades: ImportEntidadResumen
  tiposElemento: ImportEntidadResumen
  errores: ImportError[]
  esAplicable: boolean
}

export interface ImportCatalogosResultado {
  aplicado: boolean
  preview: ImportCatalogosPreview
  mensaje: string
}

interface ApiResponse<T> {
  message: string
  data: T
}

async function postFile<T>(url: string, archivo: File): Promise<ApiResponse<T>> {
  const fd = new FormData()
  fd.append("archivo", archivo)
  const res = await fetch(url, { method: "POST", body: fd })
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    const text = await res.text()
    throw new Error(`Respuesta no-JSON (${res.status}): ${text.slice(0, 300)}`)
  }
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? `Error ${res.status}`)
  return json
}

export function useImportCatalogosExcelPreview() {
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportCatalogosPreview>("/api/catalogos/preview", archivo),
  })
}

export function useImportCatalogosExcelApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportCatalogosResultado>("/api/catalogos/apply", archivo),
    onSuccess: (resp) => {
      if (resp.data.aplicado) {
        qc.invalidateQueries({ queryKey: ["especialidades"] })
        qc.invalidateQueries({ queryKey: ["elementos-tipos"] })
        qc.invalidateQueries({ queryKey: ["elementostipos"] })
      }
    },
  })
}

export function descargarPlantillaCatalogos() {
  const a = document.createElement("a")
  a.href = "/api/catalogos/plantilla"
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
