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

/**
 * Espejo del backend AvanceAgrupacionFilteredDTO. Sirve tanto para Área como
 * para Módulo (los campos son idénticos). El chart y la página no distinguen.
 */
export interface AvanceAgrupacionFilteredDTO {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  cantidadElementos: number
  totalTareas: number
  completadas: number
  porcentajeAvance: number
}

export type AvanceAgrupacionFilters = AvanceSubsistemaFilters

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
  /**
   * Tareas completadas en esta semana. Null en semanas posteriores al corte
   * — la curva real se grafica hasta MAX(hoy, último FechaFinalizacion). Las
   * semanas futuras devuelven null para que Recharts interrumpa la línea
   * verde en el punto correcto en lugar de extender una recta plana.
   */
  real: number | null
  programadoAcum: number
  /** Acumulado de real. Null en semanas posteriores al corte (ver real). */
  realAcum: number | null
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
  /**
   * True si el proyecto está finalizado — por estado (COMPLETADO/CERRADO/
   * EN_CIERRE/CANCELADO) o por cálculo automático (todas las tareas terminales).
   * El front lo usa para esconder la línea vertical "Hoy".
   */
  proyectoTerminado: boolean
  /** Semana ISO del último FechaFinalizacion. Null si no hay registros. */
  semanaUltimoRegistro: string | null
  /** Semana ISO del fin de la planificación actual (Pn). Null si no hay planificación. */
  semanaFinProgramadoActual: string | null
  /** Semana ISO del fin del baseline (P0). Null si no hay baseline. */
  semanaFinProgramadoBaseline: string | null
}
