export interface Especialidad {
  id: string
  nombre: string
  codigo: string | null
  color: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EspecialidadInput {
  nombre: string
  codigo?: string
  color?: string
}
