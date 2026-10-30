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
  /** Alto en mm para Espacio (sólo cuando tipoDato === 13). Default 20, rango 5-200. */
  altoMm?: number
  /** Texto fijo multilínea (sólo cuando tipoDato === 15 / Nota). */
  textoLargo?: string | null
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
  /**
   * Valores ya cargados que dependen del tipo (registros + precargados de elemento).
   * Es lo que decide si se puede cambiar el tipo de dato — estar en una planilla no
   * alcanza. Sólo viene en el GET por id; en los listados llega en 0.
   */
  valoresCargados?: number

  /**
   * Equipo de administración dueño. Null/undefined = global: lo comparten todas las
   * planillas y lo administra un AdminGlobal. Mismo contrato que `Planilla.equipoId`.
   */
  equipoId?: string | null
  equipoNombre?: string | null
  /**
   * Si quien mira puede editarlo. Lo resuelve el backend — no reimplementar la regla acá,
   * porque las dos se desincronizan.
   */
  puedeEditar?: boolean

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
  /** El código lo propuso el sistema: si está tomado, el backend agrega un sufijo _2, _3… */
  codigoAutomatico?: boolean
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
  /** Alto en mm para Espacio (sólo tipoDato === 13). Default 20, rango 5-200. */
  altoMm?: number
  /** Texto fijo multilínea (sólo tipoDato === 15 / Nota). */
  textoLargo?: string | null
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
  /** Alto en mm para Espacio (sólo tipoDato === 13). Default 20, rango 5-200. */
  altoMm?: number
  /** Texto fijo multilínea (sólo tipoDato === 15 / Nota). */
  textoLargo?: string | null
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
  /** Peso relativo del ancho (1..12). Default 2 si no se manda. */
  ancho?: number
  /** Unidad opcional que se muestra en cada celda editable (máx 20). */
  unidad?: string | null
}

export interface CampoTablaColumnaUpdateInput {
  id: string
  campoId: string
  encabezado: string
  orden: number
  esColumnaEtiqueta: boolean
  /** Header agrupador opcional. Ver docstring en `types` (planillas). */
  grupo?: string | null
  /**
   * Peso relativo del ancho (1..12). El PUT reemplaza la fila entera, así que hay
   * que reenviarlo siempre o el backend lo vuelve al default.
   */
  ancho?: number
  /** Unidad opcional (máx 20). Igual que el ancho: hay que reenviarla siempre. */
  unidad?: string | null
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
