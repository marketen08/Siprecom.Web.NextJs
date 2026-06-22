export interface Nivel {
  id: string
  nombre: string
  posicion: number
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface NivelCreateInput {
  nombre: string
  posicion: number
}

export interface NivelUpdateInput {
  nombre: string
  posicion: number
}
