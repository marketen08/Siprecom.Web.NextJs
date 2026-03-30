export interface AvanceDTO {
  id: string
  nombre: string
  codigo: string
  porcentajeAvance: number
  totalTareas: number
  pendiente: number
  enProceso: number
  completado: number
  aprobado: number
  rechazado: number
  cancelado: number
}

export interface AvanceSistemaDTO extends AvanceDTO {
  subSistemas: AvanceDTO[]
}

export interface AvanceProyectoDTO extends AvanceDTO {
  sistemas: AvanceSistemaDTO[]
}
