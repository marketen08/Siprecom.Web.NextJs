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
}

export interface GenerarPlanificacionResult {
  tareasFijas: number
  tareasAsignadas: number
  /** Subset de tareasAsignadas: cuántas eran Manual vencidas que se sobrescribieron. */
  manualesVencidasReasignadas: number
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
