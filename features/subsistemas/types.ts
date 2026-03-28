export interface SubSistema {
  id: string
  codigo: string
  nombre: string
  sistemaId: string
  proyectoId: string
  fechaInicio: string
  fechaFin: string
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface SubSistemaCreateInput {
  codigo: string
  nombre: string
  sistemaId: string
  fechaInicio: string
  fechaFin: string
}

export interface SubSistemaUpdateInput {
  codigo: string
  nombre: string
  sistemaId: string
  fechaInicio: string
  fechaFin: string
  proyectoId: string
}
