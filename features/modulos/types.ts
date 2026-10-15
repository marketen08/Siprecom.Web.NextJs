export interface Modulo {
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

export interface ModuloCreateInput {
  codigo: string
  nombre: string
  descripcion?: string | null
}

export interface ModuloUpdateInput {
  codigo: string
  nombre: string
  descripcion?: string | null
}
