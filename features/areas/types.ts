export interface Area {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  proyectoId: string
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface AreaCreateInput {
  codigo: string
  nombre: string
  descripcion?: string | null
}

export interface AreaUpdateInput {
  codigo: string
  nombre: string
  descripcion?: string | null
}
