import type { AlineacionTexto, CampoOpcion, CampoTablaColumna, CampoTablaFila, CampoTipoDato } from "@/features/planillas/types"

export interface Campo {
  id: string
  codigo: string
  etiqueta: string
  /** Etiqueta alternativa opcional (traducción/comentario). Se dibuja debajo del label en itálica. */
  etiquetaAlt?: string
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
  /** Líneas para TextoArea (sólo cuando tipoDato === 12). Default 3, rango 1-20. */
  numeroLineas?: number
  /**
   * Sólo Boolean (tipoDato === 4): se presenta como casilla de marca (X / vacío) en
   * vez de un Sí/No. El valor sigue siendo un booleano — cambia sólo la presentación.
   */
  mostrarComoMarca?: boolean
  /** Estilo de Label (sólo cuando tipoDato === 10). */
  negrita?: boolean
  conBorde?: boolean
  fondoGris?: boolean
  alineacion?: AlineacionTexto
  sinPadding?: boolean
  sinMargen?: boolean
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
  /** Etiqueta alternativa opcional (traducción/comentario). Se dibuja debajo del label en itálica. */
  etiquetaAlt?: string
  tipoDato: CampoTipoDato
  unidad?: string
  descripcion?: string
  imagenUrl?: string
  numeroFilas?: number
  /** Líneas para TextoArea (sólo tipoDato === 12). Default 3, rango 1-20. */
  numeroLineas?: number
  /** Sólo Boolean (tipoDato === 4): casilla de marca (X / vacío) en vez de Sí/No. */
  mostrarComoMarca?: boolean
  esObligatorioDefault?: boolean
  negrita?: boolean
  conBorde?: boolean
  fondoGris?: boolean
  alineacion?: AlineacionTexto
  sinPadding?: boolean
  sinMargen?: boolean
}

export interface CampoUpdateInput {
  id: string
  codigo: string
  etiqueta: string
  /** Etiqueta alternativa opcional (traducción/comentario). Se dibuja debajo del label en itálica. */
  etiquetaAlt?: string
  tipoDato: CampoTipoDato
  unidad?: string
  descripcion?: string
  imagenUrl?: string
  numeroFilas?: number
  /** Líneas para TextoArea (sólo tipoDato === 12). Default 3, rango 1-20. */
  numeroLineas?: number
  /** Sólo Boolean (tipoDato === 4): casilla de marca (X / vacío) en vez de Sí/No. */
  mostrarComoMarca?: boolean
  esObligatorioDefault?: boolean
  negrita?: boolean
  conBorde?: boolean
  fondoGris?: boolean
  alineacion?: AlineacionTexto
  sinPadding?: boolean
  sinMargen?: boolean
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
  /** Header agrupador opcional. Ver docstring en `types` (planillas). */
  grupo?: string | null
}

export interface CampoTablaColumnaUpdateInput {
  id: string
  campoId: string
  encabezado: string
  orden: number
  esColumnaEtiqueta: boolean
  /** Header agrupador opcional. Ver docstring en `types` (planillas). */
  grupo?: string | null
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
