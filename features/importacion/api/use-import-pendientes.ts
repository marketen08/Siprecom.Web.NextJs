import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ImportPendientesPreview, ImportPendientesResultado } from "../types"

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

export function useImportPendientesPreview() {
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportPendientesPreview>("/api/import/pendientes/preview", archivo),
  })
}

export function useImportPendientesApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportPendientesResultado>("/api/import/pendientes/apply", archivo),
    onSuccess: (resp) => {
      if (resp.data.aplicado) {
        qc.invalidateQueries({ queryKey: ["pendientes"] })
      }
    },
  })
}

export function descargarPlantillaPendientes() {
  const a = document.createElement("a")
  a.href = "/api/import/pendientes/plantilla"
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
