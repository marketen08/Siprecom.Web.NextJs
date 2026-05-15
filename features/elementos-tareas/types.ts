export const ESTADO_ELEMENTO_TAREA = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  4: "Firmado físico",
  5: "Rechazado",
  6: "Cancelado",
  7: "Firmado",
} as const

export interface ElementoTarea {
  id: string
  elementoId: string
  elementoNombre: string
  tareaId: string
  tareaNombre: string
  nivelId: string | null
  nivelNombre: string | null
  nivelPosicion: number | null
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
  esFisico: boolean

  // Firmas — agregados desde el backend para badge contextual del firmante actual.
  firmasTotal: number
  firmasCompletadas: number
  /** El usuario actual ya firmó al menos un slot de este registro. */
  usuarioYaFirmo: boolean
  /** El usuario actual tiene un slot de firma pendiente con su rol. */
  usuarioPuedeFirmar: boolean

  // Planilla asociada a la Tarea
  planillaId: string | null
  planillaNombre: string | null

  // Control
  requiereInspeccion: boolean
  esCritica: boolean
  prioridad: number
  prioridadTexto: string
  intentos: number

  isActive: boolean
  createdAt: string
}
