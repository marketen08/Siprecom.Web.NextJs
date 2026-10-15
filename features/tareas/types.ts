export const PRIORIDAD: Record<number, string> = {
  1: "Baja",
  2: "Media",
  3: "Alta",
  4: "Urgente",
}

export const PRIORIDAD_COLOR: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
}

// (TipoAsignacionTarea eliminado 2026-09 — todas las tareas son
// ELEMENTO_INDIVIDUAL. Con el rediseño de TestGroups los paquetes sintéticos
// son Elementos comunes y no hay distinción de "modo de asignación".)

// Espejo del enum CalculoProximaFecha del backend (preservación).
export const CALCULO_PROXIMA_FECHA = {
  DesdeCompletado: 1,
  DesdePlanificada: 2,
} as const

export type CalculoProximaFecha = (typeof CALCULO_PROXIMA_FECHA)[keyof typeof CALCULO_PROXIMA_FECHA]

export const CALCULO_PROXIMA_FECHA_LABEL: Record<number, string> = {
  1: "Desde fecha de completado",
  2: "Desde fecha planificada",
}

export interface Tarea {
  id: string
  codigo: number
  nombre: string
  proyectoId: string
  proyectoNombre?: string
  elementoTipoId?: string
  elementoTipoNombre?: string
  especialidadId?: string
  especialidadNombre?: string
  nivelId?: string
  nivelNombre?: string
  planillaId?: string
  planillaNombre?: string
  procedimientoId?: string
  procedimientoNombre?: string
  prioridad: number
  prioridadTexto?: string
  terminalId?: string
  terminalNombre?: string
  horasBase: number
  impactoBase: number
  tareaPrecedenteId?: string | null
  tareaPrecedenteNombre?: string | null
  lagDias: number
  esPreservacion: boolean
  /** Tarea puntual: no la expanden los generadores; se asigna eligiendo elementos a mano. */
  esAdHoc: boolean
  periodoSemanas?: number | null
  calculoProximaFecha: number
  createdByNombre?: string
  updatedByNombre?: string
  createdAt: string
  updatedAt: string
}

export interface TareaCreateInput {
  codigo: number
  nombre: string
  proyectoId: string
  elementoTipoId?: string
  nivelId?: string
  planillaId?: string
  procedimientoId?: string
  prioridad: number
  horasBase: number
  impactoBase: number
  tareaPrecedenteId?: string | null
  lagDias?: number
  esPreservacion?: boolean
  /** Tarea puntual: no la expanden los generadores; se asigna eligiendo elementos a mano. */
  esAdHoc?: boolean
  periodoSemanas?: number | null
  calculoProximaFecha?: number
}

export interface TareaUpdateInput {
  id: string
  codigo: number
  nombre: string
  proyectoId: string
  elementoTipoId?: string
  nivelId?: string
  planillaId?: string
  procedimientoId?: string
  prioridad: number
  horasBase: number
  impactoBase: number
  tareaPrecedenteId?: string | null
  lagDias?: number
  esPreservacion?: boolean
  /** Tarea puntual: no la expanden los generadores; se asigna eligiendo elementos a mano. */
  esAdHoc?: boolean
  periodoSemanas?: number | null
  calculoProximaFecha?: number
}
