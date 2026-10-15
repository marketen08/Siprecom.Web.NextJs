// Tipos espejados de Core/DTOs/Databook/DatabookDTO.cs

export const EstadoDatabookJob = {
  PENDIENTE:  1,
  EN_PROCESO: 2,
  COMPLETADO: 3,
  ERROR:      4,
} as const
export type EstadoDatabookJobValue =
  (typeof EstadoDatabookJob)[keyof typeof EstadoDatabookJob]

/** Body del POST /databooks para encolar la generación. */
export interface DatabookSolicitudInput {
  /**
   * Opcional. Null/vacío = todos los subsistemas del proyecto activo. Útil para
   * databooks por Nivel (ej. "todo PRECOMISIONADO").
   */
  subSistemaId?: string | null
  nivelId?: string | null
  especialidadId?: string | null
  notificarPorEmail: boolean
}

export interface DatabookSolicitudResponse {
  jobId: string
  estado: EstadoDatabookJobValue
}

/** Estado de un job — usado para polling y listado. */
export interface DatabookJob {
  id: string
  proyectoId: string

  /** Null cuando el databook abarca todos los subsistemas del proyecto. */
  subSistemaId: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  sistemaCodigo: string | null
  sistemaNombre: string | null

  nivelId: string | null
  nivelNombre: string | null
  especialidadId: string | null
  especialidadNombre: string | null

  estado: EstadoDatabookJobValue
  estadoTexto: string

  solicitadoPorId: string
  solicitadoPorNombre: string | null
  notificarPorEmail: boolean

  creadoEn: string
  fechaInicio: string | null
  fechaCompletado: string | null

  mensajeProgreso: string | null
  registrosTotales: number | null
  registrosProcesados: number | null
  /** 0..100 calculado en backend post-Select. */
  porcentajeAvance: number

  tamanioBytes: number | null
  paginasTotal: number | null
  mensajeError: string | null

  puedeDescargar: boolean
}

/** Respuesta del endpoint de descarga. */
export interface DatabookDescargaResponse {
  url: string
  fileName: string
}
