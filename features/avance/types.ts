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
  elementoTipoEspecialidad: string | null
  prioridadTexto: string
  pid: string | null
  testpack: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
}

export interface AvanceSistemaDTO extends AvanceDTO {
  subSistemas: AvanceDTO[]
}

export interface AvanceProyectoDTO extends AvanceDTO {
  sistemas: AvanceSistemaDTO[]
}
