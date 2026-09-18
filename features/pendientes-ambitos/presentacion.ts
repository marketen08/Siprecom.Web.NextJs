import {
  AlertTriangle,
  Briefcase,
  EyeOff,
  Flag,
  Lock,
  Shield,
  Star,
  type LucideIcon,
} from "lucide-react"

/**
 * Traducción de las claves de presentación del ámbito a lucide y a clases de Tailwind.
 *
 * El backend guarda **claves semánticas** ("candado", "ambar"), no nombres de lucide ni
 * hex: la app mobile dibuja los mismos ámbitos con Ionicons y su propia paleta. Cada
 * cliente mapea la clave a lo suyo, y el ámbito se ve coherente en los tres lados.
 *
 * El conjunto válido lo define y valida `AmbitoPresentacion` en el backend — si agregás
 * una clave allá, sumala acá también o el ícono no se dibuja.
 */

export const ICONOS_AMBITO: { clave: string; label: string; Icon: LucideIcon }[] = [
  { clave: "candado", label: "Candado", Icon: Lock },
  { clave: "escudo", label: "Escudo", Icon: Shield },
  { clave: "ojo-tachado", label: "Ojo tachado", Icon: EyeOff },
  { clave: "estrella", label: "Estrella", Icon: Star },
  { clave: "bandera", label: "Bandera", Icon: Flag },
  { clave: "maletin", label: "Maletín", Icon: Briefcase },
  { clave: "alerta", label: "Alerta", Icon: AlertTriangle },
]

/** Clases por token de color: `text` para el ícono suelto, el resto para el chip. */
export const COLORES_AMBITO: {
  clave: string
  label: string
  text: string
  chip: string
  swatch: string
}[] = [
  { clave: "ambar", label: "Ámbar", text: "text-amber-700", chip: "bg-amber-50 text-amber-800 border-amber-200", swatch: "bg-amber-500" },
  { clave: "rojo", label: "Rojo", text: "text-red-700", chip: "bg-red-50 text-red-800 border-red-200", swatch: "bg-red-500" },
  { clave: "azul", label: "Azul", text: "text-blue-700", chip: "bg-blue-50 text-blue-800 border-blue-200", swatch: "bg-blue-500" },
  { clave: "verde", label: "Verde", text: "text-green-700", chip: "bg-green-50 text-green-800 border-green-200", swatch: "bg-green-500" },
  { clave: "violeta", label: "Violeta", text: "text-violet-700", chip: "bg-violet-50 text-violet-800 border-violet-200", swatch: "bg-violet-500" },
  { clave: "gris", label: "Gris", text: "text-slate-600", chip: "bg-slate-50 text-slate-700 border-slate-200", swatch: "bg-slate-400" },
]

const COLOR_DEFAULT = COLORES_AMBITO[0] // ámbar: el color del candado de internos

export function iconoDeAmbito(clave: string | null | undefined): LucideIcon | null {
  if (!clave) return null
  return ICONOS_AMBITO.find((i) => i.clave === clave)?.Icon ?? null
}

export function colorDeAmbito(clave: string | null | undefined) {
  return COLORES_AMBITO.find((c) => c.clave === clave) ?? COLOR_DEFAULT
}

/**
 * ¿Hay que marcar este pendiente en el listado? Solo si su ámbito tiene ícono
 * configurado. Es decisión del admin y no del código: el principal se siembra sin
 * ícono —marcar todas las filas sería ruido— pero si alguien quiere marcarlo, puede.
 */
export function tieneMarcaAmbito(icono: string | null | undefined): boolean {
  return Boolean(icono && iconoDeAmbito(icono))
}
