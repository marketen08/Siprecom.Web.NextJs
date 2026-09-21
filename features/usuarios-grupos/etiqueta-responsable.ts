import type { GrupoResponsableOpcion } from "./types"

/**
 * Cómo se muestra un grupo en el select de responsable: el nombre más cuántos de sus
 * miembros ven el proyecto.
 *
 * Es texto plano porque el Combobox sólo acepta strings — y además así entra en la
 * búsqueda, que es útil: escribir "nadie" filtra los grupos que no servirían.
 *
 * Se usa el conteo EN EL PROYECTO y no el total: un grupo con diez miembros y ninguno
 * acá recibe el pendiente y no se entera nadie.
 */
export function etiquetaGrupoResponsable(g: GrupoResponsableOpcion): string {
  if (g.miembrosEnProyecto === 0) return `${g.nombre} · nadie en el proyecto`
  return `${g.nombre} · ${g.miembrosEnProyecto} en el proyecto`
}

/**
 * Aviso para un grupo que nadie va a ver. No bloquea: asignar a un grupo que todavía
 * no tiene gente cargada puede ser deliberado. Distingue los dos casos porque la
 * corrección es distinta — sumar miembros al grupo, o asignar el proyecto a los que ya
 * están.
 */
export function avisoGrupoResponsable(g: GrupoResponsableOpcion | undefined): string | null {
  if (!g || g.miembrosEnProyecto > 0) return null
  if (g.cantidadMiembros === 0)
    return `"${g.nombre}" no tiene miembros: el pendiente no le va a aparecer a nadie en "Míos".`
  return `Ninguno de los ${g.cantidadMiembros} miembros de "${g.nombre}" tiene asignado este proyecto: el pendiente no le va a aparecer a nadie en "Míos".`
}
