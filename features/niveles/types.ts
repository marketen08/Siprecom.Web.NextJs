export interface Nivel {
  id: string
  nombre: string
  posicion: number
  /** Hex #RRGGBB o #RRGGBBAA. Null = sin color asignado (el UI cae a un gris neutro). */
  color: string | null
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface NivelCreateInput {
  nombre: string
  posicion: number
  color?: string | null
}

export interface NivelUpdateInput {
  nombre: string
  posicion: number
  color?: string | null
}
