import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  ImportValoresPrecargadosPreview,
  ImportValoresPrecargadosResultado,
} from "../types"

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

export function useImportValoresPrecargadosPreview() {
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportValoresPrecargadosPreview>(
        "/api/import/valores-precargados/preview",
        archivo,
      ),
  })
}

export function useImportValoresPrecargadosApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) =>
      postFile<ImportValoresPrecargadosResultado>(
        "/api/import/valores-precargados/apply",
        archivo,
      ),
    onSuccess: (resp) => {
      // Invalidar el cache de valores precargados de todos los elementos afectados.
      // Como no tenemos los IDs específicos, invalidamos a nivel "elementos" general.
      if (resp.data.aplicado) {
        qc.invalidateQueries({ queryKey: ["elementos"] })
      }
    },
  })
}

export function descargarPlantillaValoresPrecargados(opts?: {
  subSistemaId?: string | null
  tareaId?: string | null
}) {
  const qs = new URLSearchParams()
  if (opts?.subSistemaId) qs.set("subSistemaId", opts.subSistemaId)
  if (opts?.tareaId) qs.set("tareaId", opts.tareaId)
  const s = qs.toString()
  const url = s
    ? `/api/import/valores-precargados/plantilla?${s}`
    : "/api/import/valores-precargados/plantilla"

  const a = document.createElement("a")
  a.href = url
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
