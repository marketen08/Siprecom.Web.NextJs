export interface Procedimiento {
  id: string
  nombre: string
  observaciones: string
  /** Legacy: texto libre del nombre del archivo. Reemplazado por nombreArchivo + archivoUrl. */
  nombreArchivoId: string

  /** Nombre original del PDF subido (para mostrar al usuario). Null si no hay archivo. */
  nombreArchivo: string | null
  contentType: string | null
  tamanioBytes: number | null
  /** SAS URL temporal (~60 min) para descargar/visualizar el PDF. Null si no hay archivo. */
  archivoUrl: string | null

  /**
   * Equipo de administración dueño. Null = global: lo ven y lo usan todos, lo administra un
   * AdminGlobal. Mismo contrato que `Planilla.equipoId` y `Campo.equipoId`.
   */
  equipoId?: string | null
  equipoNombre?: string | null
  /** Si quien mira puede editarlo. Lo resuelve el backend; no reimplementar la regla acá. */
  puedeEditar?: boolean

  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ProcedimientoCreateInput {
  nombre: string
  observaciones?: string
  nombreArchivoId?: string
}

export interface ProcedimientoUpdateInput {
  nombre: string
  observaciones?: string
  nombreArchivoId?: string
}
