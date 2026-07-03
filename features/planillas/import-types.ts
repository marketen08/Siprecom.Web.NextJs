import type { CampoTipoDato } from "./types"

export interface CampoImportado {
  nombre: string
  etiqueta: string
  tipoDato: CampoTipoDato
  esObligatorio: boolean
  opciones?: string[] // para tipo Lista (5)
  /** Ancho del campo en la grilla 12 (1-12). Opcional; si no viene, se usa el default. */
  tamano?: number
  /**
   * Modo de render para tipo Lista (5): 0=Dropdown, 1=Radio, 2=Checkbox, 3=Checklist.
   * Ignorado para otros tipos.
   */
  renderMode?: number
  /**
   * Si la IA identificó un campo del catálogo global que encaja semánticamente,
   * incluye acá su id. En ese caso, al persistir NO se crea campo nuevo — se
   * reutiliza el existente. Los demás atributos (etiqueta, tipoDato, etc.) se
   * usan sólo para mostrar en la preview.
   */
  campoIdExistente?: string
  /**
   * Sólo para tipo Tabla (9). Columnas de la tabla.
   *  - Si NO hay `filas`, la tabla es dinámica (el operador agrega filas al cargar).
   *  - Si SÍ hay `filas`, la tabla es matriz (filas fijas). En ese caso una columna
   *    puede marcarse `esColumnaEtiqueta: true` para ser la 1ª columna read-only con
   *    las etiquetas de fila precargadas.
   */
  columnas?: Array<{ encabezado: string; esColumnaEtiqueta?: boolean }>
  /** Sólo para tipo Tabla (9) matriz. Filas predefinidas con su etiqueta. */
  filas?: Array<{ etiquetaFila: string }>
  /**
   * Sólo para tipo Tabla (9) dinámica. Número de filas vacías por defecto
   * al abrir la carga (rango 2-10). Ignorado si hay `filas` (matriz).
   */
  numeroFilas?: number
}

export interface SeccionImportada {
  nombre: string
  campos: CampoImportado[]
}

export interface PlanillaImportada {
  nombre: string
  secciones: SeccionImportada[]
}

// Payload que el cliente envía a /api/ai/planilla-desde-excel
export interface ExcelParsePayload {
  nombreArchivo: string
  filas: string[][] // matriz de celdas como strings
}

/**
 * Payload que el cliente envía a /api/ai/planilla-desde-descripcion.
 * `catalogo` es un resumen del catálogo global de campos (id/codigo/etiqueta/tipoDato)
 * para que la IA reuse campos existentes en vez de crear duplicados.
 */
export interface DescripcionParsePayload {
  descripcion: string
  catalogo: CatalogoCampoResumen[]
}

export interface CatalogoCampoResumen {
  id: string
  codigo: string
  etiqueta: string
  tipoDato: CampoTipoDato
}
