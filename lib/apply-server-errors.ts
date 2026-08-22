import type { UseFormReturn, Path, FieldValues } from "react-hook-form"

/**
 * Error de validación tal como lo devuelve el backend: nombre del field en
 * PascalCase + lista de mensajes.
 */
export interface ServerValidationError {
  field?: string
  errors?: string[]
}

/**
 * Aplica los errores de validación del backend a los fields del form. Si el
 * field name no está en el `fieldMap`, cae a `"root"` (mensaje global que el
 * form muestra como banner).
 *
 * Diseñado para usarse en un `useEffect` con `serverErrors` como dependencia —
 * cada vez que el mutation retorne un error, se aplica al form.
 *
 * Vive en `lib/` y no dentro de un feature porque el mapeo backend→form es el
 * mismo para todos los formularios; lo específico de cada uno es su fieldMap.
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
