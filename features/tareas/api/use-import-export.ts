import { useQuery, useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export type TareaModo = "omitir" | "crear"

export interface ProyectoMigracion {
  id: string
  nombre: string
  clienteNombre: string | null
}

export interface TareaImportPreviewItem {
  codigo: number
  nombre: string
  planillaExiste: boolean
  yaExisteEnDestino: boolean
  conflicto: string | null
  esAplicable: boolean
}

export interface TareasBulkImportPreview {
  total: number
  proyectoDestinoNombre: string
  tareas: TareaImportPreviewItem[]
}

export interface TareaImportItemResultado {
  codigo: number
  nombre: string
  aplicado: boolean
  omitida: boolean
  accion: string
  mensaje: string
}

export interface TareasBulkImportResultado {
  aplicado: boolean
  creadas: number
  omitidas: number
  total: number
  resultados: TareaImportItemResultado[]
  mensaje: string
}

export function useProyectosMigracion() {
  return useQuery({
    queryKey: ["migracion", "tareas", "proyectos"],
    queryFn: () => apiClient.get<ApiResponse<ProyectoMigracion[]>>("/api/migracion/tareas/proyectos"),
  })
}

/** Descarga el JSON de tareas de un proyecto (SuperAdmin). */
export function exportarTareas(proyectoId: string) {
  const a = document.createElement("a")
  a.href = `/api/migracion/tareas/export?proyectoId=${encodeURIComponent(proyectoId)}`
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

export function useImportTareasPreview() {
  return useMutation({
    mutationFn: ({ data, proyectoDestinoId }: { data: unknown; proyectoDestinoId: string }) =>
      apiClient.post<ApiResponse<TareasBulkImportPreview>>(
        `/api/migracion/tareas/import/preview?proyectoDestinoId=${encodeURIComponent(proyectoDestinoId)}`,
        data,
      ),
  })
}

export function useImportTareasApply() {
  return useMutation({
    mutationFn: ({ data, proyectoDestinoId, modo }: { data: unknown; proyectoDestinoId: string; modo: TareaModo }) =>
      apiClient.post<ApiResponse<TareasBulkImportResultado>>(
        `/api/migracion/tareas/import?proyectoDestinoId=${encodeURIComponent(proyectoDestinoId)}&modo=${encodeURIComponent(modo)}`,
        data,
      ),
  })
}
