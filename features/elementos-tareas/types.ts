export const ESTADO_ELEMENTO_TAREA = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  4: "Aprobado",
  5: "Rechazado",
  6: "Cancelado",
} as const

export interface ElementoTarea {
  id: string
  elementoId: string
  elementoNombre: string
  tareaId: string
  tareaNombre: string
  proyectoId: string
  proyectoNombre: string
  terminalId: string
  terminalNombre: string
  codigo: string

  // Estado
  estado: number
  estadoTexto: string
  motivoRechazo: string

  // Planificación
  fechaPlanificada: string | null
  fechaInicio: string | null
  fechaFinalizacion: string | null
  fechaLimite: string | null

  // Asignación
  asignadoA: string
  asignadoNombre: string
  supervisorId: string
  supervisorNombre: string

  // Progreso
  porcentajeAvance: number
  horasEstimadas: number | null
  horasReales: number | null
  observaciones: string

  // Registro
  registroId: string | null

  // Control
  requiereInspeccion: boolean
  esCritica: boolean
  prioridad: number
  prioridadTexto: string
  intentos: number

  // Aprobación
  fechaAprobacion: string | null
  aprobadoPor: string
  aprobadoNombre: string

  isActive: boolean
  createdAt: string
}
