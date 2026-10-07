import { PowerOff } from "lucide-react"

/**
 * Cartel para una pantalla cuya funcionalidad global está apagada.
 *
 * El ítem del menú ya desaparece, pero la ruta sigue existiendo: un favorito, un link
 * pegado en un mail o una pestaña abierta desde antes llegan igual. Sin esto la
 * pantalla se veía normal y lo que fallaba era el guardar, con un 403 del backend.
 *
 * No redirige al dashboard a propósito: quien llegó acá buscaba algo concreto, y saber
 * que la funcionalidad existe pero está desactivada es la respuesta a su pregunta.
 */
export function FuncionalidadDesactivada({
  titulo,
  descripcion,
}: {
  titulo: string
  descripcion: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-gray-50 px-6 py-12 text-center">
      <PowerOff className="h-6 w-6 text-gray-400" />
      <p className="text-sm font-medium text-gray-900">{titulo}</p>
      <p className="max-w-md text-xs text-muted-foreground">{descripcion}</p>
      <p className="text-xs text-muted-foreground">
        Un SuperAdmin puede volver a habilitarla desde Licenciamiento → Funcionalidades.
      </p>
    </div>
  )
}
