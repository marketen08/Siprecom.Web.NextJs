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

function descargar(href: string) {
  const a = document.createElement("a")
  a.href = href
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** Las tareas activas de ESTE proyecto, con las filas en SKIP. Para editar lo que ya hay. */
export function descargarPlantillaTareas() {
  descargar("/api/import/tareas/plantilla")
}

/**
 * La matriz de tareas de TODOS los proyectos de la base, deduplicada y con las filas en
 * CREATE. Es la plantilla para sembrar un proyecto nuevo: trae las tareas de todos los tipos
 * de elemento, y las de tipos que el proyecto no tenga se sacan después con "Limpiar sin
 * elementos" del listado de tareas.
 *
 * Admin-only en el backend: barre proyectos que el usuario puede no tener asignados.
 */
export function descargarPlantillaMaestraTareas() {
  descargar("/api/import/tareas/plantilla-maestra")
}
