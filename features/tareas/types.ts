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

// Espejo del enum TipoAsignacionTarea del backend.
export const TIPO_ASIGNACION_TAREA = {
  ELEMENTO_INDIVIDUAL: 1,
  TEST_GROUP_PRESSURE: 2,
  TEST_GROUP_BASIC_FUNCTION: 3,
} as const

export type TipoAsignacionTarea = (typeof TIPO_ASIGNACION_TAREA)[keyof typeof TIPO_ASIGNACION_TAREA]

export const TIPO_ASIGNACION_LABEL: Record<number, string> = {
  1: "Por elemento",
  2: "Por Pressure Test Pack",
  3: "Por Basic Function",
}

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
  tipoAsignacion: TipoAsignacionTarea
  tipoAsignacionTexto?: string
  tareaPrecedenteId?: string | null
  tareaPrecedenteNombre?: string | null
  lagDias: number
  esPreservacion: boolean
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
  tipoAsignacion: number
  tareaPrecedenteId?: string | null
  lagDias?: number
  esPreservacion?: boolean
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
  tipoAsignacion: number
  tareaPrecedenteId?: string | null
  lagDias?: number
  esPreservacion?: boolean
  periodoSemanas?: number | null
  calculoProximaFecha?: number
}
