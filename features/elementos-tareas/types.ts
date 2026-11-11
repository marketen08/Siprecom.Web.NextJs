export const ESTADO_ELEMENTO_TAREA = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  4: "Firmado físico",
  5: "Rechazado",
  6: "Cancelado",
  7: "Firmado",
} as const

/**
 * Origen de la FechaPlanificada actual:
 * - Manual (0): la cargó/editó un usuario desde la UI. El generador la respeta si está
 *   en el futuro y la reasigna con advertencia si está vencida.
 * - Generada (1): la asignó el generador automático. Reasignable libremente.
 */
export const FECHA_PLANIFICADA_ORIGEN = {
  0: "Manual",
  1: "Generada",
} as const

export type FechaPlanificadaOrigen = keyof typeof FECHA_PLANIFICADA_ORIGEN

export interface ElementoTarea {
  id: string
  elementoId: string
  elementoNombre: string
  elementoTag: string | null
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
  fechaPlanificadaOrigen: FechaPlanificadaOrigen
  fechaInicio: string | null
  fechaFinalizacion: string | null
  fechaLimite: string | null

  // Asignación
  /** Todos los asignados activos de la tarea. */
  asignados?: { usuarioId: string; nombre: string | null }[]
  /** Si el usuario de la sesión está entre los asignados (lo precalcula el backend). */
  usuarioEstaAsignado?: boolean
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
  /**
   * Adjuntos del usuario en el registro (sin el escaneo físico ni el certificado).
   * Habilita el ítem "Descargar adjuntos" del menú de acciones.
   */
  adjuntosTotal?: number
  /**
   * El usuario actual puede descartar la carga en papel de esta tarea: está en APROBADO,
   * el registro es un escaneo sin ninguna firma electrónica, y él es Admin o fue quien la
   * subió dentro de las últimas 24 horas.
   *
   * Lo calcula el backend. No se reimplementa acá a propósito: la regla mezcla el estado
   * del registro, quién lo cargó y una ventana de tiempo, y dos copias se separan.
   */
  puedeEliminarCargaFisica?: boolean

  // Planilla asociada a la Tarea
  planillaId: string | null
  planillaNombre: string | null

  // Procedimiento asociado a la Tarea (opcional). Solo mostramos "Descargar procedimiento"
  // cuando procedimientoTieneArchivo === true.
  procedimientoId: string | null
  procedimientoNombre: string | null
  procedimientoTieneArchivo: boolean

  // Control
  requiereInspeccion: boolean
  esCritica: boolean
  prioridad: number
  prioridadTexto: string
  intentos: number

  // Preservación — heredado de Tarea.EsPreservacion. El sheet principal filtra estas
  // tareas del listado y las delega al sheet de preservación del elemento.
  esPreservacion: boolean
  /** 0 = tarea normal o primer ciclo; N = ciclo N generado por PreservacionService. */
  cicloNumero: number

  isActive: boolean
  createdAt: string
}

