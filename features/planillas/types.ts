/** Orientación del PDF de la planilla: 0 = Vertical, 1 = Horizontal (apaisado). */
export type OrientacionPdf = 0 | 1

export interface Planilla {
  id: string
  codigo?: string
  nombre: string
  descripcion?: string
  observaciones?: string
  nombreArchivoId?: string
  version?: string
  requiereFirma: boolean
  permiteAdjuntos: boolean
  generaPdfFinal: boolean
  orientacionPdf: OrientacionPdf
  createdByNombre?: string
  updatedByNombre?: string
  createdAt: string
  updatedAt: string
}

export interface PlanillaSeccion {
  id: string
  planillaId: string
  nombre: string
  descripcion?: string
  orden: number
}

export interface CampoOpcion {
  id: string
  campoId: string
  valor: string
  etiqueta: string
  orden: number
  /** Marca la opción como valor por defecto del campo (sólo una por campo). */
  esDefault?: boolean
}

// 6 = Firma y 7 = Adjunto fueron eliminados como tipos de campo. Se gestionan a nivel registro:
//   - Firmas: ProyectosFirmasConfig + RegistroFirma.
//   - Adjuntos: flags Proyecto.PermiteAdjuntos / Planilla.PermiteAdjuntos + RegistroArchivo.
export type CampoTipoDato = 1 | 2 | 3 | 4 | 5 | 8 | 9 | 10

export const CAMPO_TIPO_DATO: Record<CampoTipoDato, string> = {
  1: "Texto",
  2: "Número",
  3: "Fecha",
  4: "Boolean",
  5: "Lista",
  8: "Imagen",
  9: "Tabla",
  10: "Label",
}

// ─── Tipos "visuales" en el picker ──────────────────────────────────────────
//
// Bajo el capó una lista tipo checklist es `tipoDato=5 + renderMode=3`. Pero
// desde el punto de vista del usuario elegir "Lista y después Checklist" es un
// paso de más — y las planillas industriales están *llenas* de checklists.
// Por eso presentamos Checklist como un tipo aparte al costado de Lista.
// El sentinel 501 es puramente de UI; NUNCA se envía al backend.

/** Sentinel de UI para Checklist. No es un valor de `CampoTipoDato` real. */
export const TIPO_UI_CHECKLIST = 501

export type TipoUiValor = CampoTipoDato | typeof TIPO_UI_CHECKLIST

export const CAMPO_TIPO_UI: Record<TipoUiValor, string> = {
  1: "Texto",
  2: "Número",
  3: "Fecha",
  4: "Boolean",
  5: "Lista",
  [TIPO_UI_CHECKLIST]: "Checklist",
  8: "Imagen",
  9: "Tabla",
  10: "Label",
}

/**
 * Deriva el "tipo visual" a mostrar en el picker a partir del par real
 * (tipoDato, renderMode). Un campo Lista con render Checklist se ve como
 * "Checklist" en la UI; el resto se ve como su tipoDato.
 */
export function toTipoUi(tipoDato: CampoTipoDato, renderMode?: number | null): TipoUiValor {
  if (tipoDato === 5 && renderMode === 3) return TIPO_UI_CHECKLIST
  return tipoDato
}

/**
 * Traduce una elección del picker visual al par real (tipoDato, renderMode
 * sugerido). `renderMode` sólo es orientativo — el llamador decide si lo
 * aplica (útil cuando el usuario cambia entre Lista/Checklist y hay que
 * ajustar renderMode automáticamente).
 */
export function fromTipoUi(tipoUi: TipoUiValor): { tipoDato: CampoTipoDato; renderMode?: CampoListaRenderMode } {
  if (tipoUi === TIPO_UI_CHECKLIST) return { tipoDato: 5, renderMode: 3 }
  return { tipoDato: tipoUi as CampoTipoDato }
}

/** Alineación horizontal del texto de un campo Label. 0=Izquierda, 1=Centro, 2=Derecha. */
export type AlineacionTexto = 0 | 1 | 2

export const ALINEACION_TEXTO_LABEL: Record<AlineacionTexto, string> = {
  0: "Izquierda",
  1: "Centro",
  2: "Derecha",
}

/** Columna de un campo Tabla (tipoDato === 9). Encabezado definido al diseñar la planilla. */
export interface CampoTablaColumna {
  id: string
  campoId: string
  encabezado: string
  orden: number
  /** True si es la columna de etiquetas (primera columna read-only de una tabla matriz). */
  esColumnaEtiqueta: boolean
}

/** Fila predefinida de un campo Tabla matriz. Su presencia convierte la tabla en "matriz" (filas fijas). */
export interface CampoTablaFila {
  id: string
  campoId: string
  etiquetaFila: string
  orden: number
}

/** Opciones predefinidas de tamaño en grilla 12. -1 = personalizado (input numérico). */
export const CAMPO_TAMANO_OPCIONES = [
  { label: "Completo (12)", value: 12 },
  { label: "Ancho (10)", value: 10 },
  { label: "Tres cuartos (9)", value: 9 },
  { label: "Dos tercios (8)", value: 8 },
  { label: "Medio (6)", value: 6 },
  { label: "Tercio (4)", value: 4 },
  { label: "Cuarto (3)", value: 3 },
  { label: "Sexto (2)", value: 2 },
  { label: "Personalizado", value: -1 },
] as const

export const CAMPO_TAMANO_DEFAULT = 6

/** Cómo se renderiza un campo Lista en formularios y PDFs. Otros tipos lo ignoran. */
export type CampoListaRenderMode = 0 | 1 | 2 | 3

export const CAMPO_LISTA_RENDER_MODE = {
  Auto: 0,
  Inline: 1,
  Dropdown: 2,
  Checklist: 3,
} as const

/**
 * Labels de los render modes. Nota: `Auto` (0) queda deprecado — no se ofrece
 * más en el picker (`CAMPO_LISTA_RENDER_MODE_OPCIONES`), pero se conserva acá
 * porque campos viejos guardados con 0 siguen mostrando algo razonable en
 * detalles. El backend normaliza 0 → 1 al guardar (ver PlanillaService).
 */
export const CAMPO_LISTA_RENDER_MODE_LABEL: Record<CampoListaRenderMode, string> = {
  0: "Automático (legacy)",
  1: "Inline (opciones visibles separadas)",
  2: "Desplegable (select)",
  3: "Checklist (tabla agrupada con columnas)",
}

/**
 * Opciones a ofrecer en los selects de render mode. Sin `Auto` (0): la elección
 * automática nunca resolvía Checklist y confundía más de lo que ayudaba.
 * Además el picker visual dual (Lista vs Checklist) ya cubre el caso común.
 */
export const CAMPO_LISTA_RENDER_MODE_OPCIONES: Array<{ value: CampoListaRenderMode; label: string }> = [
  { value: 1, label: "Inline (opciones visibles separadas)" },
  { value: 2, label: "Desplegable (select)" },
  { value: 3, label: "Checklist (tabla agrupada con columnas)" },
]

export interface PlanillaCampoDetalle {
  id: string
  planillaId: string
  planillaSeccionId?: string
  planillaSeccionNombre?: string
  campoId: string
  campoCodigo?: string
  campoEtiqueta?: string
  campoTipoDato: CampoTipoDato
  campoTipoDatoNombre?: string
  campoUnidad?: string
  /** URL del blob con la imagen (vive en el Campo global). Solo si tipoDato === 8. */
  campoImagenUrl?: string
  orden: number
  esObligatorio: boolean
  visible: boolean
  soloLectura: boolean
  valorDefault?: string
  /** Solo aplica cuando campoTipoDato === 5 (Lista). Default Auto. */
  renderMode: CampoListaRenderMode
  /** Ancho en grilla 12 (1-12). Default 4. */
  tamano: number
  opciones: CampoOpcion[]
  /** Solo aplica cuando campoTipoDato === 9 (Tabla). Filas efectivas para tabla dinámica. */
  numeroFilas?: number
  /** Columnas definidas (solo Tabla). Vacío para otros tipos. */
  columnas?: CampoTablaColumna[]
  /** Filas predefinidas (solo Tabla matriz). Vacío si es dinámica o no es Tabla. */
  filas?: CampoTablaFila[]
  /** Estilo de Label (vive en el Campo global). Solo si campoTipoDato === 10. */
  campoNegrita?: boolean
  campoConBorde?: boolean
  campoFondoGris?: boolean
  campoAlineacion?: AlineacionTexto
  campoSinPadding?: boolean
  campoSinMargen?: boolean
}

export interface PlanillaEstructura {
  planilla: Planilla
  secciones: PlanillaSeccion[]
  campos: PlanillaCampoDetalle[]
}

export interface PlanillaCreateInput {
  codigo?: string
  nombre: string
  descripcion?: string
  observaciones?: string
  version?: string
  requiereFirma?: boolean
  permiteAdjuntos?: boolean
  generaPdfFinal?: boolean
  orientacionPdf?: OrientacionPdf
}

export interface PlanillaUpdateInput {
  id: string
  codigo?: string
  nombre: string
  descripcion?: string
  observaciones?: string
  version?: string
  requiereFirma?: boolean
  permiteAdjuntos?: boolean
  generaPdfFinal?: boolean
  orientacionPdf?: OrientacionPdf
}

export interface PlanillaSeccionCreateInput {
  planillaId: string
  nombre: string
  descripcion?: string
  orden: number
}

export interface PlanillaSeccionUpdateInput {
  id: string
  planillaId: string
  nombre: string
  descripcion?: string
  orden: number
}

export interface PlanillaCampoCreateInput {
  planillaId: string
  campoId: string
  planillaSeccionId?: string
  orden: number
  esObligatorio: boolean
  visible: boolean
  soloLectura: boolean
  valorDefault?: string
  renderMode?: CampoListaRenderMode
  tamano?: number
  /** Override de filas para Tabla dinámica (null = usa Campo.numeroFilas). */
  numeroFilas?: number | null
}

export interface PlanillaCampoUpdateInput {
  id: string
  planillaId: string
  campoId: string
  planillaSeccionId?: string
  orden: number
  esObligatorio: boolean
  visible: boolean
  soloLectura: boolean
  valorDefault?: string
  renderMode?: CampoListaRenderMode
  tamano?: number
  /** Override de filas para Tabla dinámica (null = usa Campo.numeroFilas). */
  numeroFilas?: number | null
}
