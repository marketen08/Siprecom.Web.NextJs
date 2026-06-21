import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ImportTareasPreview, ImportTareasResultado } from "../types"

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

export function useImportTareasPreview() {
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportTareasPreview>("/api/import/tareas/preview", archivo),
  })
}

export function useImportTareasApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportTareasResultado>("/api/import/tareas/apply", archivo),
    onSuccess: (resp) => {
      if (resp.data.aplicado) {
        qc.invalidateQueries({ queryKey: ["tareas"] })
      }
    },
  })
}

export function descargarPlantillaTareas() {
  const a = document.createElement("a")
  a.href = "/api/import/tareas/plantilla"
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
