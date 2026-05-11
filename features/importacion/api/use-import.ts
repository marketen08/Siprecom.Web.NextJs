import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ImportPreview, ImportResultado } from "../types"

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

export function useImportPreview() {
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportPreview>("/api/import/preview", archivo),
  })
}

export function useImportApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportResultado>("/api/import/apply", archivo),
    onSuccess: (resp) => {
      // Si se aplicó, invalidamos los listados afectados.
      if (resp.data.aplicado) {
        qc.invalidateQueries({ queryKey: ["sistemas"] })
        qc.invalidateQueries({ queryKey: ["subsistemas"] })
        qc.invalidateQueries({ queryKey: ["elementos"] })
      }
    },
  })
}

export function descargarPlantilla() {
  // Anchor programático para forzar download. El proxy ya pone Content-Disposition.
  const a = document.createElement("a")
  a.href = "/api/import/plantilla"
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
