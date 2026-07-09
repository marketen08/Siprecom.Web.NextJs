// Espejo de PreservacionCicloListItemDTO del backend.
export interface PreservacionCicloListItem {
  elementoTareaId: string
  proyectoId: string
  elementoId: string
  elementoTag: string
  elementoNombre: string
  tareaId: string
  tareaNombre: string
  tareaCodigo: number
  fechaPlanificada: string | null
  fechaTerminado: string | null
  /** EstadoElementoTarea: 1=PENDIENTE, 2=EN_PROCESO, 3=COMPLETADO, 4=APROBADO, 5=RECHAZADO, 6=CANCELADO, 7=FIRMADO. */
  estado: number
  cicloNumero: number
  periodoSemanasEfectivo: number | null
  elementoTareaOrigenId: string | null
  elementoRetirado: boolean
}

export const ESTADO_ET = {
  PENDIENTE: 1,
  EN_PROCESO: 2,
  COMPLETADO: 3,
  APROBADO: 4,
  RECHAZADO: 5,
  CANCELADO: 6,
  FIRMADO: 7,
} as const

export const ESTADO_ET_LABEL: Record<number, string> = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  4: "Firmado físico",
  5: "Rechazado",
  6: "Cancelado",
  7: "Firmado",
}

/** Estados que consideramos "abiertos" (todavía pueden ejecutarse). */
export const ESTADOS_ABIERTOS = new Set<number>([1, 2, 3])

export interface PreservacionCiclosFilter {
  proyectoId?: string
  desde?: string | null
  hasta?: string | null
  estado?: number | null
  elementoId?: string | null
}
