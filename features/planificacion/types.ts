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
