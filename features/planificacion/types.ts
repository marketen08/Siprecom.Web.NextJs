export interface CapacidadEspecialidad {
  id: string
  proyectoId: string
  especialidadId: string
  especialidadNombre: string
  especialidadCodigo: string | null
  especialidadColor: string | null
  horasPorDia: number
}

export interface CapacidadBulkInput {
  capacidades: Array<{
    especialidadId: string
    horasPorDia: number
  }>
}

export interface EspecialidadDetalle {
  especialidadId: string
  especialidadNombre: string
  especialidadCodigo: string | null
  especialidadColor: string | null
  tareasPendientes: number
  horasPendientes: number
  horasPorDia: number
  diasNecesarios: number
  sinCapacidadConfigurada: boolean
}

export interface EstimacionPlanificacion {
  fechaInicio: string
  tareasPendientes: number
  horasPendientesTotal: number
  diasLaborablesNecesarios: number
  fechaFinEstimada: string
  fechaFinPlanificada: string | null
  diasDeMargen: number | null
  porEspecialidad: EspecialidadDetalle[]
  warnings: string[]
}

// ── Generador ───────────────────────────────────────────────────────────────

export interface GenerarPlanificacionInput {
  fechaInicio?: string
  dryRun: boolean
  /** Si true, reprograma tareas cuya ventana SubSistemaNivel ya terminó (atrasadas). */
  incluirAtrasadas?: boolean
  /**
   * Si true, cuando la capacidad dentro de la ventana SubSistemaNivel se agota el generador
   * empuja la tarea más allá del fin de la ventana. Cada cambio lleva excedeVentana=true.
   */
  permitirExcederVentana?: boolean
  /**
   * Si true, las tareas con fecha Manual + futura se sobrescriben con una asignación nueva.
   * Default false (las Manual+futuras son fijas implícitas). Cada cambio lleva
   * eraManualFutura=true. DESTRUCTIVO — perdés las fechas cargadas a mano.
   */
  reasignarManualesFuturas?: boolean
}

export interface CambioFechaPlanificada {
  elementoTareaId: string
  elementoTag: string | null
  elementoNombre: string | null
  tareaNombre: string | null
  especialidadNombre: string | null
  nivelNombre: string | null
  subSistemaCodigo: string | null
  /** Fecha previa de la tarea (null si no tenía). Con valor → el generador la está reemplazando. */
  fechaAnterior: string | null
  fechaNueva: string
  /** True si fue reprogramada fuera de su ventana SubSistemaNivel (estaba atrasada). */
  esAtrasada: boolean
  /** True si la tarea tenía fecha Manual vencida que el generador está sobrescribiendo. */
  eraManualVencida: boolean
  /**
   * True si la tarea fue empujada más allá del fin de su ventana SubSistemaNivel porque
   * la capacidad dentro del rango se agotó. Distinto de esAtrasada — acá la ventana NO
   * había terminado, simplemente se llenó.
   */
  excedeVentana: boolean
  /** True si la tarea venía con fecha Manual + futura y se sobrescribió. */
  eraManualFutura: boolean
}

export interface GenerarPlanificacionResult {
  tareasFijas: number
  tareasAsignadas: number
  /** Subset de tareasAsignadas: cuántas eran Manual vencidas que se sobrescribieron. */
  manualesVencidasReasignadas: number
  /** Subset de tareasAsignadas: cuántas eran Manual + futura que se sobrescribieron. */
  manualesFuturasReasignadas: number
  tareasSinAsignar: number
  fechaFinEstimada: string | null
  cambios: CambioFechaPlanificada[]
  warnings: string[]
  aplicado: boolean
}

// ── Versiones (snapshots P1, P2…) ───────────────────────────────────────────

export interface PlanificacionVersionListItem {
  id: string
  numero: number
  nombre: string
  descripcion: string | null
  createdAt: string
  createdByNombre: string | null
  cantidadTareas: number
  /** True si esta versión es el baseline (P0) del proyecto. Solo una por proyecto. */
  esBaseline: boolean
}

export interface PlanificacionVersionTareaSnapshot {
  elementoTareaId: string
  elementoTag: string | null
  elementoNombre: string | null
  tareaNombre: string | null
  nivelNombre: string | null
  subSistemaCodigo: string | null
  especialidadNombre: string | null
  fechaPlanificada: string
  /** 0 = Manual, 1 = Generada. */
  fechaPlanificadaOrigen: number
}

export interface PlanificacionVersionDetalle extends PlanificacionVersionListItem {
  tareas: PlanificacionVersionTareaSnapshot[]
}

export interface PlanificacionVersionUpdateInput {
  nombre: string
  descripcion?: string | null
}

// ── Planificación manual (edición de FechaPlanificada en bulk) ──────────────

export interface PlanificacionTareaItem {
  elementoTareaId: string
  elementoTag: string | null
  elementoNombre: string | null
  tareaNombre: string | null
  sistemaId: string | null
  subSistemaId: string | null
  subSistemaCodigo: string | null
  nivelId: string | null
  nivelNombre: string | null
  nivelPosicion: number | null
  especialidadId: string | null
  especialidadNombre: string | null
  especialidadColor: string | null
  /** 1=PENDIENTE, 2=EN_PROCESO, 3=COMPLETADO, 4=APROBADO, 5=RECHAZADO, 7=FIRMADO */
  estado: number
  fechaPlanificada: string | null
  /** 0=Manual, 1=Generada */
  fechaPlanificadaOrigen: number
  ventanaInicio: string | null
  ventanaFin: string | null
}

export interface PlanificacionTareasFiltros {
  sistemaId?: string
  subSistemaId?: string
  nivelId?: string
  especialidadId?: string
  estado?: number
  /** 0=Manual, 1=Generada */
  origen?: number
  sinFecha?: boolean
}

export interface PlanificacionFechaCambio {
  elementoTareaId: string
  /** null = limpiar */
  fechaPlanificada: string | null
}

export interface PlanificacionFechasBulkResult {
  actualizadas: number
  noEncontradas: number
}
