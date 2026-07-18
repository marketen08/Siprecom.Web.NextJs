import type { TipoCertificado } from "@/features/certificados/types"

export interface ElementoTipo {
  id: string
  nombre: string
  especialidadId: string
  especialidadNombre: string | null
  especialidadCodigo: string | null
  especialidadColor: string | null
  horasAdicionalesDefault: number
  impactoFactorDefault: number
  esSintetico: boolean
  certificadoQueAlimenta: TipoCertificado | null
  permiteAgrupar: boolean
  tiposFisicosPermitidosIds: string[]
  planillaEncabezadoId: string | null
  planillaEncabezadoNombre: string | null
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ElementoTipoCreateInput {
  nombre: string
  especialidadId: string
  horasAdicionalesDefault: number
  impactoFactorDefault: number
  esSintetico: boolean
  certificadoQueAlimenta: TipoCertificado | null
  permiteAgrupar: boolean
  tiposFisicosPermitidosIds: string[]
  planillaEncabezadoId: string | null
}

export interface ElementoTipoUpdateInput {
  nombre: string
  especialidadId: string
  horasAdicionalesDefault: number
  impactoFactorDefault: number
  esSintetico: boolean
  certificadoQueAlimenta: TipoCertificado | null
  permiteAgrupar: boolean
  tiposFisicosPermitidosIds: string[]
  planillaEncabezadoId: string | null
}
