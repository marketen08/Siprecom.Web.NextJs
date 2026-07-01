// Espejo del enum TipoCertificado del backend.
export const TIPO_CERTIFICADO = {
  RFC: 1,
  RFSU: 2,
  AOC: 3,
} as const

export type TipoCertificado = (typeof TIPO_CERTIFICADO)[keyof typeof TIPO_CERTIFICADO]

export const TIPO_CERTIFICADO_LABEL: Record<number, string> = {
  1: "RFC",
  2: "RFSU",
  3: "AOC",
}

export const TIPO_CERTIFICADO_NOMBRE: Record<number, string> = {
  1: "Ready For Commissioning",
  2: "Ready For Startup",
  3: "Acceptance Of Commissioning",
}

export interface CertificadoEmitido {
  id: string
  tipo: TipoCertificado
  emitidoEn: string
  emitidoPorNombre: string | null
  comentarios: string | null
  pdfUrl: string | null
}

export interface CategoriaEstado {
  cantidadPacks: number
  cantidadPacksTerminales: number
  porcentajeAvance: number
  listoParaEmitir: boolean
  emitido: CertificadoEmitido | null
  noAplica: boolean
}

export interface SubsistemaCertificadoEstado {
  subSistemaId: string
  subSistemaCodigo: string
  subSistemaNombre: string
  sistemaId: string
  sistemaCodigo: string | null
  sistemaNombre: string | null
  rfc: CategoriaEstado
  rfsu: CategoriaEstado
  aoc: CategoriaEstado
}

export interface EmitirCertificadoInput {
  subSistemaId: string
  tipo: TipoCertificado
  comentarios?: string
}
