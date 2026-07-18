import type { FamiliaMetadataTG } from "@/features/elementostipos/types"
import type { TipoCertificado } from "@/features/certificados/types"

export const ESTADO_TEST_GROUP = {
  BORRADOR: 1,
  ACTIVO: 2,
  COMPLETADO: 3,
  CERRADO: 4,
} as const

export type EstadoTestGroup = (typeof ESTADO_TEST_GROUP)[keyof typeof ESTADO_TEST_GROUP]

export interface TestGroup {
  id: string
  proyectoId: string
  subSistemaId: string
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  // Rediseño 2026-07: la "tipología" ahora viene del ElementoTipo del sintético.
  elementoSinteticoId: string
  elementoTipoSinteticoId: string
  elementoTipoSinteticoNombre: string | null
  familiaMetadataTG: FamiliaMetadataTG
  certificadoQueAlimenta: TipoCertificado | null
  codigo: string
  nombre: string
  descripcion: string | null
  estado: EstadoTestGroup
  estadoTexto: string

  cantidadElementos: number
  cantidadTareas: number
  cantidadTareasTerminales: number
  porcentajeAvance: number

  // F6.2 — certificado activo (RFC/RFSU/AOC) que cubre este pack. Bloquea cambios.
  tieneCertificadoActivo?: boolean
  certificadoActivoTipo?: number | null
  certificadoActivoTipoTexto?: string | null
  certificadoActivoEmitidoEn?: string | null
  certificadoActivoEmitidoPorNombre?: string | null

  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface TestGroupCreateInput {
  subSistemaId: string
  elementoTipoSinteticoId: string
  codigo: string
  nombre: string
  descripcion?: string | null
}

export interface TestGroupUpdateInput {
  subSistemaId: string
  codigo: string
  nombre: string
  descripcion?: string | null
}
