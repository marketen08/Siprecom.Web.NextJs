export interface ElementoTipo {
  id: string
  nombre: string
  especialidadId: string
  especialidadNombre: string | null
  especialidadCodigo: string | null
  especialidadColor: string | null
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
  especialidadId: string
  horasBaseDefault: number
  impactoBaseDefault: number
  horasAdicionalesDefault: number
  impactoFactorDefault: number
}

export interface ElementoTipoUpdateInput {
  nombre: string
  especialidadId: string
  horasBaseDefault: number
  impactoBaseDefault: number
  horasAdicionalesDefault: number
  impactoFactorDefault: number
}
