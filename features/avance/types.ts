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
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
}

export interface AvanceSubSistemaNivelDTO {
  nivelId: string
  nivelNombre: string
  nivelPosicion: number
  fechaInicio: string | null
  fechaFin: string | null
  totalTareas: number
  tareasTerminales: number
  porcentajeAvance: number
  completado: boolean
}

export interface AvanceSubSistemaDTO extends AvanceDTO {
  /** True si el subsistema tiene un PDF de plano cargado. */
  tienePlano: boolean
  /** Nombre del archivo (para tooltip). Null si no hay plano. */
  planoNombreArchivo: string | null
  /** Desglose por nivel: fechas planificadas + avance parcial. Ordenado por posicion. */
  niveles?: AvanceSubSistemaNivelDTO[]
  /** Sistema padre (poblado en el endpoint de detalle). */
  sistemaId?: string
  sistemaCodigo?: string | null
  sistemaNombre?: string | null
}

export interface AvanceSistemaDTO extends AvanceDTO {
  subSistemas: AvanceSubSistemaDTO[]
}

export interface AvanceProyectoDTO extends AvanceDTO {
  sistemas: AvanceSistemaDTO[]
}

export interface AvanceAgrupacionDTO extends AvanceDTO {
  descripcion: string | null
  cantidadElementos: number
  /** Desglose por nivel (áreas/módulos) — mismo shape que subsistemas. */
  niveles?: AvanceSubSistemaNivelDTO[]
}
