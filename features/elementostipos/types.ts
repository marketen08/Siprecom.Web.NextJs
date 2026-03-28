export interface ElementoTipo {
  id: string
  nombre: string
  especialidad: string
  horasBaseDefault: number
  impactoBaseDefault: number
  horasAdicionalesDefault: number
  impactoFactorDefault: number
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ElementoTipoCreateInput {
  nombre: string
  especialidad?: string
  horasBaseDefault: number
  impactoBaseDefault: number
  horasAdicionalesDefault: number
  impactoFactorDefault: number
}

export interface ElementoTipoUpdateInput {
  nombre: string
  especialidad?: string
  horasBaseDefault: number
  impactoBaseDefault: number
  horasAdicionalesDefault: number
  impactoFactorDefault: number
}
