import type { CampoTipoDato } from "./types"

export interface CampoImportado {
  nombre: string
  etiqueta: string
  tipoDato: CampoTipoDato
  esObligatorio: boolean
  /**
   * Opciones para Lista (5), Checklist (11) y Leyenda (16).
   *
   * La IA manda strings sueltos ("Sí", "No", "N/A") para Lista y Checklist, y
   * pares código/descripción para Leyenda, donde el valor ES el código que se
   * imprime en negrita. Las dos formas las normaliza
   * `crear-planilla-importada.ts`.
   */
  opciones?: Array<string | { valor?: string; etiqueta?: string }>
  /** Ancho del campo en la grilla 12 (1-12). Opcional; si no viene, se usa el default. */
  tamano?: number
  /**
   * Modo de render para tipo Lista (5): 1=Inline, 2=Dropdown. El 0 (Auto) está
   * deprecado —el backend lo normaliza a 1— y el 3 (Checklist) se promovió a
   * tipo de dato propio (tipoDato = 11). Ignorado para otros tipos.
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
  columnas?: Array<{
    encabezado: string
    esColumnaEtiqueta?: boolean
    /**
     * Header agrupador opcional. Columnas consecutivas con el mismo `grupo`
     * se dibujan bajo una fila extra de encabezado en el PDF/web. La IA lo
     * propone cuando el Excel tiene celdas combinadas arriba de varias columnas.
     */
    grupo?: string
  }>
  /**
   * Sólo para tipo Tabla (9) matriz. Filas predefinidas.
   * `etiquetaFila` puede ir vacía: es un renglón en blanco.
   * `celdasPrecargadas` lleva texto fijo por celda, indexado por POSICIÓN de columna
   * (todas, incluida la de etiqueta, cuya posición se ignora); null o "" = celda para
   * completar.
   */
  filas?: Array<{ etiquetaFila: string; celdasPrecargadas?: (string | null)[] }>
  /**
   * Sólo para tipo Tabla (9) dinámica. Número de filas vacías por defecto
   * al abrir la carga (rango 2-10). Ignorado si hay `filas` (matriz).
   */
  numeroFilas?: number
  /** Sólo para TextoArea (12). Renglones de puntos a imprimir (1-20, default 3). */
  numeroLineas?: number
  /** Sólo para Espacio (13) y Croquis (14). Alto del recuadro en mm (5-200, default 20). */
  altoMm?: number
  /**
   * Sólo para Nota (15). El texto fijo multilínea que se imprime. Va en
   * `Campo.TextoLargo` y NO en la etiqueta —que está capada en 200 chars y
   * tiene índice—: sin esto la Nota nace vacía.
   */
  textoLargo?: string
  /** Sólo para Boolean (4). Se presenta como casilla de marca en vez de Sí/No. */
  mostrarComoMarca?: boolean
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
  /**
   * Resumen del catálogo global de campos para que la IA reutilice campos
   * existentes en vez de crear duplicados — mismo mecanismo que el flujo
   * desde-descripcion. Opcional para retro-compatibilidad; sin catálogo la
   * IA crea todos los campos como nuevos.
   */
  catalogo?: CatalogoCampoResumen[]
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
