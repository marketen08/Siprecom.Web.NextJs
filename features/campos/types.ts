import type { CampoOpcion, CampoTablaColumna, CampoTablaFila, CampoTipoDato } from "@/features/planillas/types"

export interface Campo {
  id: string
  codigo: string
  etiqueta: string
  tipoDato: CampoTipoDato
  tipoDatoNombre?: string
  unidad?: string
  /** Default de obligatoriedad: precarga el checkbox al agregar el campo a una planilla. */
  esObligatorioDefault?: boolean
  descripcion?: string
  /** URL del blob con la imagen embebida (sólo cuando tipoDato === 8 / Imagen). */
  imagenUrl?: string
  /** Filas por defecto para Tabla dinámica (sólo cuando tipoDato === 9). */
  numeroFilas?: number
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
  numeroFilas?: number
  esObligatorioDefault?: boolean
}

export interface CampoUpdateInput {
  id: string
  codigo: string
  etiqueta: string
  tipoDato: CampoTipoDato
  unidad?: string
  descripcion?: string
  imagenUrl?: string
  numeroFilas?: number
  esObligatorioDefault?: boolean
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

export interface CampoTablaColumnaCreateInput {
  campoId: string
  encabezado: string
  orden: number
  esColumnaEtiqueta: boolean
}

export interface CampoTablaColumnaUpdateInput {
  id: string
  campoId: string
  encabezado: string
  orden: number
  esColumnaEtiqueta: boolean
}

export interface CampoTablaFilaCreateInput {
  campoId: string
  etiquetaFila: string
  orden: number
}

export interface CampoTablaFilaUpdateInput {
  id: string
  campoId: string
  etiquetaFila: string
  orden: number
}

export type { CampoOpcion, CampoTablaColumna, CampoTablaFila }
