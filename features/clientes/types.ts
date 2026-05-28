export interface Cliente {
  id: string
  nombre: string
  urlLogo: string
  /** SAS URL temporal (~1h) para leer el logo desde el browser. Null si no hay logo. */
  logoSasUrl?: string | null
  esContratista: boolean
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ClienteCreateInput {
  nombre: string
  esContratista: boolean
}

export interface ClienteUpdateInput {
  nombre: string
  esContratista: boolean
}
