import type { UseFormReturn, Path, FieldValues } from "react-hook-form"
import type { CampoFormValues } from "../schema"

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

export interface ServerValidationError {
  field?: string
  errors?: string[]
}

/**
 * Aplica los errores de validación del backend a los fields del form. Si el
 * field name no está en el `fieldMap`, cae a `"root"` (mensaje global que se
 * muestra como banner arriba de los botones).
 *
 * Diseñado para usarse en un `useEffect` con `serverErrors` como dependencia —
 * cada vez que el mutation retorne un error, se aplica al form.
 */
export function applyServerErrorsToForm<T extends FieldValues>(
  form: UseFormReturn<T>,
  serverErrors: ServerValidationError[] | undefined,
  fieldMap: Record<string, keyof T>,
) {
  if (!serverErrors || serverErrors.length === 0) return
  for (const item of serverErrors) {
    const msgs = item.errors ?? []
    if (msgs.length === 0) continue
    const targetField = item.field ? fieldMap[item.field] : undefined
    if (targetField) {
      form.setError(targetField as Path<T>, { type: "server", message: msgs.join(" ") })
    } else {
      form.setError("root" as Path<T>, { type: "server", message: msgs.join(" ") })
    }
  }
}
