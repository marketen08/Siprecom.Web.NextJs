/** Orientación del PDF de la planilla: 0 = Vertical, 1 = Horizontal (apaisado). */
export type OrientacionPdf = 0 | 1

/** Preset de márgenes de página. 0 = Normal (default), 1 = Estrecho, 2 = UltraEstrecho. */
export type MargenPagina = 0 | 1 | 2

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
  /** Reduce paddings verticales y tamaños en el PDF para caber en 1 hoja. */
  modoCompacto: boolean
  margenPagina: MargenPagina
  /** Especialidad opcional. Null = genérica (aparece al filtrar por cualquier especialidad). */
  especialidadId?: string | null
  especialidadNombre?: string | null
  especialidadCodigo?: string | null
  especialidadColor?: string | null
  /** True = candidata al select "Planilla del encabezado" del ElementoTipo sintético. */
  esEncabezadoTG?: boolean
  createdByNombre?: string
  updatedByNombre?: string
  createdAt: string
  updatedAt: string
}

export interface PlanillaSeccion {
  id: string
  planillaId: string
  nombre: string
  /** Nombre alternativo opcional (traducción/aclaración). Se renderiza debajo del título en PDF. */
  nombreAlt?: string | null
  descripcion?: string
  orden: number
  /** Si es false, el header de la sección no se dibuja en el PDF. Default true. */
  mostrarTitulo?: boolean
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
// 11 = Checklist se agregó como tipo propio (antes era Lista + renderMode=Checklist).
// 13 = Espacio: bloque vacío display-only (alto en mm). Es LAYOUT, no dato — igual que
//      8 (Imagen) y 10 (Label), queda fuera de los valores del registro. El croquis
//      DIGITAL (que sí persiste una imagen) irá como tipo propio, no como flag de éste.
export type CampoTipoDato = 1 | 2 | 3 | 4 | 5 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15

export const CAMPO_TIPO_DATO: Record<CampoTipoDato, string> = {
  1: "Texto",
  2: "Número",
  3: "Fecha",
  4: "Boolean",
  5: "Lista",
  8: "Imagen",
  9: "Tabla",
  10: "Label",
  11: "Checklist",
  12: "Texto multilínea",
  13: "Espacio en blanco",
  14: "Croquis (dibujo)",
  15: "Nota (texto fijo)",
}

/**
 * Entradas de `CAMPO_TIPO_DATO` ordenadas alfabéticamente por label (locale es).
 * Usar en los select/filter del UI para que el listado sea navegable sin memorizar
 * el orden histórico del enum. Case-insensitive por `sensitivity: "base"`.
 */
export const CAMPO_TIPO_DATO_ENTRIES_SORTED: Array<[string, string]> =
  (Object.entries(CAMPO_TIPO_DATO) as Array<[string, string]>).sort(
    ([, labelA], [, labelB]) =>
      labelA.localeCompare(labelB, "es", { sensitivity: "base" }),
  )

// Nota histórica: existió un sentinel `TIPO_UI_CHECKLIST=501` con helpers
// `toTipoUi/fromTipoUi` para presentar Checklist como opción visual del picker
// mientras el modelo era Lista+renderMode. Ese shim se removió cuando
// Checklist pasó a ser un tipo propio (CampoTipoDato=11) — la migración
// EF `AddCampoChecklistTipo` promovió el modelo, y la UI ahora usa el enum
// directo sin abstracción intermedia.

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
  /**
   * Peso relativo del ancho (1..12). El ancho real es `ancho / suma(anchos)`, así que
   * no hay total que cuadrar: agregar o quitar columnas reacomoda el resto solo.
   * Default 2 (3 en la columna de etiquetas). Ver docstring de la entity.
   */
  ancho: number
  /**
   * Header agrupador opcional. Columnas consecutivas con el mismo `grupo` se
   * dibujan bajo una fila extra de encabezado en PDF y en el input web
   * (colspan). Null / vacío = columna sin agrupar. Ver docstring de la entity.
   */
  grupo?: string | null
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
 * Opciones a ofrecer en los selects de render mode para campos tipo Lista (5).
 * Sin `Auto` (0): la elección automática nunca resolvía Checklist y confundía.
 * Sin `Checklist` (3): fue promovido a su propio tipo `CampoTipoDato.Checklist=11`.
 */
export const CAMPO_LISTA_RENDER_MODE_OPCIONES: Array<{ value: CampoListaRenderMode; label: string }> = [
  { value: 1, label: "Inline (opciones visibles separadas)" },
  { value: 2, label: "Desplegable (select)" },
]

export interface PlanillaCampoDetalle {
  id: string
  planillaId: string
  planillaSeccionId?: string
  planillaSeccionNombre?: string
  campoId: string
  campoCodigo?: string
  campoEtiqueta?: string
  /** Etiqueta alternativa opcional (traducción/comentario) heredada del Campo global. */
  campoEtiquetaAlt?: string
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
  /** Layout vertical: etiqueta centrada arriba, valor/línea abajo. Default false (layout horizontal 4:6). */
  etiquetaArriba?: boolean
  /** Alineación de la etiqueta (0=Izq, 1=Centro, 2=Der). Default 0. */
  alineacionEtiqueta?: AlineacionTexto
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
  /** Filas del área de texto (vive en el Campo global). Solo si campoTipoDato === 12 (TextoArea). Default 3. */
  campoNumeroLineas?: number
  /** Alto en mm (Campo global). Solo si campoTipoDato === 13 (Espacio). Default 20. */
  campoAltoMm?: number
  /** Texto fijo multilínea (Campo global). Solo si campoTipoDato === 15 (Nota). */
  campoTextoLargo?: string | null
  /**
   * Solo si campoTipoDato === 4 (Boolean): se presenta como casilla de marca (X / vacío)
   * en vez de Sí/No. Vive en el Campo global. El valor persistido sigue siendo booleano.
   */
  campoMostrarComoMarca?: boolean
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
  modoCompacto?: boolean
  margenPagina?: MargenPagina
  especialidadId?: string | null
  esEncabezadoTG?: boolean
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
  modoCompacto?: boolean
  margenPagina?: MargenPagina
  especialidadId?: string | null
  esEncabezadoTG?: boolean
}

export interface PlanillaSeccionCreateInput {
  planillaId: string
  nombre: string
  nombreAlt?: string | null
  descripcion?: string
  orden: number
  mostrarTitulo?: boolean
}

export interface PlanillaSeccionUpdateInput {
  id: string
  planillaId: string
  nombre: string
  nombreAlt?: string | null
  descripcion?: string
  orden: number
  mostrarTitulo?: boolean
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
  /** Layout vertical (etiqueta arriba). Default false. */
  etiquetaArriba?: boolean
  /** Alineación de la etiqueta (0=Izq, 1=Centro, 2=Der). Default 0. */
  alineacionEtiqueta?: AlineacionTexto
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
  /** Layout vertical (etiqueta arriba). Default false. */
  etiquetaArriba?: boolean
  /** Alineación de la etiqueta (0=Izq, 1=Centro, 2=Der). Default 0. */
  alineacionEtiqueta?: AlineacionTexto
}
