export interface SubSistema {
  id: string
  codigo: string
  nombre: string
  sistemaId: string
  proyectoId: string
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
  /** PDF adjunto (plano del subsistema). Null si no hay archivo cargado. */
  planoNombreArchivo?: string | null
  planoContentType?: string | null
  planoTamanioBytes?: number | null
}

export interface SubSistemaCreateInput {
  codigo: string
  nombre: string
  sistemaId: string
}

export interface SubSistemaUpdateInput {
  codigo: string
  nombre: string
  sistemaId: string
  proyectoId: string
}

/** Planificación de un (subsistema, nivel). FechaInicio/FechaFin son opcionales. */
export interface SubSistemaNivel {
  id: string
  subSistemaId: string
  nivelId: string
  nivelNombre: string
  nivelPosicion: number
  fechaInicio: string | null
  fechaFin: string | null
}

export interface SubSistemaNivelUpsertInput {
  nivelId: string
  fechaInicio: string | null
  fechaFin: string | null
}
