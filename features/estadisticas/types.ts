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
}

export interface TimelineDTO {
  semanas: TimelineSemanaDTO[]
  totalTareas: number
  tareasSinProgramar: number
}
