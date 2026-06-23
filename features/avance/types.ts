export interface AvanceDTO {
  id: string
  nombre: string
  codigo: string
  porcentajeAvance: number
  totalTareas: number
  pendiente: number
  enProceso: number
  completado: number
  firmado: number
  aprobado: number
  rechazado: number
  cancelado: number
}

export interface AvanceElementoDTO extends AvanceDTO {
  elementoTipoNombre: string | null
  elementoTipoEspecialidadId: string | null
  elementoTipoEspecialidadNombre: string | null
  prioridadTexto: string
  pid: string | null
  testpack: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
}

export interface AvanceSubSistemaDTO extends AvanceDTO {
  /** True si el subsistema tiene un PDF de plano cargado. */
  tienePlano: boolean
  /** Nombre del archivo (para tooltip). Null si no hay plano. */
  planoNombreArchivo: string | null
}

export interface AvanceSistemaDTO extends AvanceDTO {
  subSistemas: AvanceSubSistemaDTO[]
}

export interface AvanceProyectoDTO extends AvanceDTO {
  sistemas: AvanceSistemaDTO[]
}
