import type { TipoCertificado } from "@/features/certificados/types"

// Espejo del enum FamiliaMetadataTG del backend.
export const FAMILIA_METADATA_TG = {
  GENERICA: 0,
  PRESSURE: 1,
  BASIC_FUNCTION: 2,
} as const

export type FamiliaMetadataTG =
  (typeof FAMILIA_METADATA_TG)[keyof typeof FAMILIA_METADATA_TG]

export const FAMILIA_METADATA_TG_LABEL: Record<number, string> = {
  0: "Genérica (vacía)",
  1: "Pressure (presión / fluido / P&ID)",
  2: "Basic Function (FTS / OTS / alcance)",
}

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
  familiaMetadataTG: FamiliaMetadataTG
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
  familiaMetadataTG: FamiliaMetadataTG
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
  familiaMetadataTG: FamiliaMetadataTG
  permiteAgrupar: boolean
  tiposFisicosPermitidosIds: string[]
  planillaEncabezadoId: string | null
}
