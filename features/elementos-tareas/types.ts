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

  // Testpack: cuando esta tarea fue cubierta por la carga de otro elemento del mismo
  // testpack, registroCompartidoId apunta al registro líder. registroEfectivoId resuelve
  // qué registro abrir/imprimir (propio o compartido). esTestpackPropagado = hermano cubierto.
  registroCompartidoId: string | null
  registroEfectivoId: string | null
  esTestpackPropagado: boolean

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

  isActive: boolean
  createdAt: string
}

// ── Testpack ───────────────────────────────────────────────────────────────

export interface TestpackMiembro {
  elementoTareaId: string
  elementoId: string
  tag: string | null
  elementoNombre: string | null
  estado: number
  estadoTexto: string
  esLider: boolean
  /** FIRMADO/APROBADO: no se puede sobrescribir. */
  esInmutable: boolean
  motivoSalteo: string | null
}

export interface TestpackGrupo {
  elementoTareaId: string
  testpack: string | null
  tieneTestpack: boolean
  tareaId: string
  tareaNombre: string | null
  lider: TestpackMiembro
  /** Hermanos del grupo (sin el líder). */
  miembros: TestpackMiembro[]
  /** Hermanos que SÍ se sobrescribirían (no inmutables). */
  cantidadAfectables: number
  /** Hermanos FIRMADO/APROBADO que se saltearían. */
  cantidadInmutables: number
}

export interface TestpackPropagacionResult {
  tieneTestpack: boolean
  testpack: string | null
  propagados: TestpackMiembro[]
  salteados: TestpackMiembro[]
  cantidadPropagados: number
  cantidadSalteados: number
}
