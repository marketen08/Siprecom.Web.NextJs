export interface Cliente {
  id: string
  nombre: string
  urlLogo: string
  esContratista: boolean
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ClienteCreateInput {
  nombre: string
  urlLogo?: string
  esContratista: boolean
}

export interface ClienteUpdateInput {
  nombre: string
  urlLogo?: string
  esContratista: boolean
}
