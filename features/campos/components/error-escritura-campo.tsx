import { AlertTriangle } from "lucide-react"

/**
 * El primer error con mensaje entre varias mutaciones, o null si ninguna falló.
 *
 * Las mutaciones del diseñador se disparan con `.mutate()` sin await —un toggle, un
 * input que pierde el foco— así que nadie estaba mirando el rechazo. El caso real es
 * el 403 de `ValidarEdicionCatalogoFilter`: el campo lo usa una planilla de otro
 * equipo (o global), el PUT se rechaza, y el control se quedaba mostrando el valor
 * nuevo como si hubiera guardado. Recién al refrescar volvía atrás.
 *
 * React Query limpia el `error` de una mutación en cuanto vuelve a ejecutarse con
 * éxito, así que el cartel desaparece solo.
 */
export function primerErrorDeMutaciones(
  ...mutaciones: Array<{ error: unknown } | null | undefined>
): string | null {
  for (const m of mutaciones) {
    const e = m?.error
    if (e instanceof Error && e.message) return e.message
  }
  return null
}

/**
 * Cartel inline para un rechazo al escribir sobre el catálogo. No hay toasts en la
 * app (ver ConfirmActionDialog, que muestra el error adentro del diálogo), así que el
 * mensaje va donde ocurrió la acción.
 */
export function ErrorEscrituraCampo({ error }: { error: string | null }) {
  if (!error) return null

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-800"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-pre-line">{error}</span>
    </div>
  )
}
