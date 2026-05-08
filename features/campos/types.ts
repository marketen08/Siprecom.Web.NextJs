import type { CampoOpcion, CampoTipoDato } from "@/features/planillas/types"

export interface Campo {
  id: string
  codigo: string
  etiqueta: string
  tipoDato: CampoTipoDato
  tipoDatoNombre?: string
  unidad?: string
  descripcion?: string
  /** URL del blob con la imagen embebida (sólo cuando tipoDato === 8 / Imagen). */
  imagenUrl?: string
  /** Cantidad de planillas activas que usan este campo. */
  usoCount?: number
  createdAt: string
  updatedAt: string
}

export interface CampoUsoPlanilla {
  planillaId: string
  planillaCodigo?: string
  planillaNombre: string
}

export interface CampoCreateInput {
  codigo: string
  etiqueta: string
  tipoDato: CampoTipoDato
  unidad?: string
  descripcion?: string
  imagenUrl?: string
}

export interface CampoUpdateInput {
  id: string
  codigo: string
  etiqueta: string
  tipoDato: CampoTipoDato
  unidad?: string
  descripcion?: string
  imagenUrl?: string
}

export interface CampoOpcionCreateInput {
  campoId: string
  valor: string
  etiqueta: string
  orden: number
}

export interface CampoOpcionUpdateInput {
  id: string
  campoId: string
  valor: string
  etiqueta: string
  orden: number
}

export type { CampoOpcion }
