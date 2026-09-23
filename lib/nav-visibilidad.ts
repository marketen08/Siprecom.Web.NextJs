import { meetsRole, type AppRole } from "@/lib/roles"
import type { MenuItem } from "@/lib/nav-menu"

/** Contexto del usuario que decide qué se ve del menú. */
export interface CtxVisibilidad {
  roles: string[]
  ocultarFirmas: boolean
  funcionalidades: Record<string, boolean>
}

/**
 * ¿Este item se le muestra a este usuario?
 *
 * Es la MISMA decisión que toma SidebarItem para renderizarse. Vive acá afuera,
 * como función pura, porque una sección necesita poder preguntar por sus hijos
 * ANTES de dibujar su cabecera.
 *
 * Sin eso, una sección se mostraba aunque el usuario no pudiera entrar a ninguna
 * de sus opciones: cada hijo se ocultaba solo, más abajo, y el padre nunca se
 * enteraba. El caso real era "Administración del sistema" con rol User —
 * `minRole: "Auditor"` deja pasar a User (nivel 3 ≥ 2), pero sus tres hijos piden
 * Admin, o listan roles que no incluyen a User. Quedaba una sección que se abría
 * vacía. Con Auditor, en cambio, "Control de cambios" sí aparece y la sección
 * tiene sentido.
 */
export function esVisible(item: MenuItem, ctx: CtxVisibilidad, inheritedMin?: AppRole): boolean {
  // Proyecto solo pre-firmados → no hay firmas electrónicas.
  if (item.requiereFirmas && ctx.ocultarFirmas) return false

  // Funcionalidad (feature flag) requerida. Se muestra sólo si está explícitamente
  // en true: si la clave falta —mapa todavía cargando, o una versión del front que
  // conoce una funcionalidad que el backend no— el item queda oculto.
  //
  // El criterio anterior era `=== false`, que falla abierto: una clave ausente
  // dejaba el item a la vista. Para un flag que arranca apagado eso es
  // exactamente al revés de lo que se quiere.
  if (item.requiereFuncionalidad && ctx.funcionalidades[item.requiereFuncionalidad] !== true) return false

  // Rol mínimo efectivo: el propio o el heredado del ancestro.
  const effectiveMin = item.minRole ?? inheritedMin

  // Lista blanca EXCLUSIVA (allowedRoles) tiene precedencia sobre la jerarquía
  // lineal (minRole). Se usa cuando roles del mismo nivel no son intercambiables
  // (ej. Auditor vs User — ambos pueden ver mucho, pero solo Auditor tiene el log).
  if (item.allowedRoles && item.allowedRoles.length > 0) {
    if (!ctx.roles?.some((r) => item.allowedRoles!.includes(r as AppRole))) return false
  } else if (effectiveMin && !meetsRole(ctx.roles, effectiveMin)) {
    return false
  }

  // Una sección que no puede ofrecer NADA no se dibuja. Se evalúa al final: los
  // gates propios ya corrieron, y `effectiveMin` es el que heredan los hijos.
  if (item.children?.length) {
    return item.children.some((hijo) => esVisible(hijo, ctx, effectiveMin))
  }

  return true
}
