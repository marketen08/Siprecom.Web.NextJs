// Tipos compartidos por el módulo de Estadísticas.

export type EstadisticasPagina =
  | "avance-subsistemas"
  | "cuantitativo-subsistemas"
  | "avance-programado"
  | "estado-pendientes"

export type DistribucionGroupBy = "estado" | "especialidad" | "categoria"

export interface DistribucionItemDTO {
  key: string
  label: string
  count: number
}

export interface AvanceSubsistemaFilteredDTO {
  subSistemaId: string
  codigo: string
  nombre: string
  sistemaId: string
  sistemaCodigo: string
  sistemaNombre: string
  totalTareas: number
  completadas: number
  porcentajeAvance: number
}

export interface AvanceSubsistemaFilters {
  sistemaId?: string
  nivelId?: string
  especialidadId?: string
}

export interface ElementosPorSubsistemaDTO {
  subSistemaId: string
  codigo: string
  nombre: string
  sistemaCodigo: string
  sistemaNombre: string
  cantidad: number
}

export interface TimelineSemanaDTO {
  semana: string
  programado: number
  real: number
  programadoAcum: number
  realAcum: number
  /** Acumulado del baseline (P0) — null si el proyecto no tiene SubSistemaNivel cargado. */
  p0Acum: number | null
}

export interface TimelineDTO {
  semanas: TimelineSemanaDTO[]
  totalTareas: number
  tareasSinProgramar: number
  semanaActual: string
  /** True si el proyecto tiene al menos una ventana SubSistemaNivel cargada. */
  tieneBaseline: boolean
}
