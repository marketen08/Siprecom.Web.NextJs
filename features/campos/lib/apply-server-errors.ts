import type { CampoFormValues } from "../schema"

// El helper genérico vive en `lib/` — lo comparten todos los formularios que
// muestran errores de validación del backend. Acá queda sólo el mapa propio del
// Campo. Se re-exporta para no tocar los imports existentes.
export {
  applyServerErrorsToForm,
  type ServerValidationError,
} from "@/lib/apply-server-errors"

/**
 * Map field name backend (Pascal Case) → field name del form (lowerCamel).
 * El helper `applyServerErrorsToForm` lo usa para mapear los errores de validación
 * que devuelve el backend al field correspondiente del formulario.
 */
export const CAMPO_FIELD_MAP: Record<string, keyof CampoFormValues> = {
  Codigo: "codigo",
  Etiqueta: "etiqueta",
  EtiquetaAlt: "etiquetaAlt",
  TipoDato: "tipoDato",
  Unidad: "unidad",
  Descripcion: "descripcion",
  NumeroFilas: "numeroFilas",
  NumeroLineas: "numeroLineas",
  AltoMm: "altoMm",
  TextoLargo: "textoLargo",
  MostrarComoMarca: "mostrarComoMarca",
}
