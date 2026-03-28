export interface Procedimiento {
  id: string
  nombre: string
  observaciones: string
  nombreArchivoId: string
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
