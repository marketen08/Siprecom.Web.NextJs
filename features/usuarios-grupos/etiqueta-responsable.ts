import type { GrupoResponsableOpcion } from "./types"
import { AudienciaAmbito, type PendienteAmbito } from "@/features/pendientes-ambitos/types"

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

/**
 * Si un grupo se ofrece para asignar. Se ocultan los que no tienen a nadie en el
 * proyecto: asignarles un pendiente es una asignación inerte, y además un grupo sin
 * gente acá es casi siempre de OTRO proyecto — así el select deja de mostrar el ruido
 * de grupos globales ajenos.
 *
 * La excepción es el grupo que el pendiente ya tiene: se muestra aunque esté vacío.
 * Si no, el select no puede representar el valor actual y el pendiente parece no tener
 * grupo — cuando lo tiene, y es justamente el caso que interesa ver para corregir.
 *
 * No se usa en el filtro del listado: ahí se buscan pendientes existentes, y los que
 * tienen asignado un grupo que quedó vacío son los que más importa encontrar.
 */
export function seOfreceComoResponsable(
  g: GrupoResponsableOpcion,
  grupoActualId?: string | null,
): boolean {
  return g.miembrosEnProyecto > 0 || g.id === grupoActualId
}

/**
 * Si el grupo puede ser responsable en ese ámbito: en uno abierto, cualquiera; en uno
 * restringido, sólo los de su audiencia — un grupo fuera de ella no vería el pendiente
 * que se le asigna, y el backend lo rechaza.
 *
 * Lo comparten el alta y Reasignar para que no puedan divergir: antes el alta filtraba y
 * Reasignar no, así que ofrecía grupos que después rebotaban al confirmar.
 *
 * Sin ámbito conocido no se filtra — el backend valida igual, y ocultar de más dejaría al
 * usuario sin opciones por un dato que falta.
 */
export function enAudienciaDelAmbito(
  g: { id: string },
  ambito: Pick<PendienteAmbito, "audiencia" | "grupos"> | undefined,
): boolean {
  if (!ambito || ambito.audiencia === AudienciaAmbito.TodoElProyecto) return true
  return ambito.grupos.some((ag) => ag.grupoId === g.id)
}

/**
 * Aviso para el grupo elegido en Reasignar. Cubre los dos casos en que la asignación no
 * sirve, que sólo pueden aparecer con el grupo que el pendiente YA tenía (los demás no se
 * ofrecen):
 *
 * - quedó fuera de la audiencia del ámbito — lo más urgente, porque el backend rechaza la
 *   asignación entera: sin sacar el grupo ni siquiera se puede cambiar el responsable.
 * - quedó sin nadie en el proyecto.
 */
export function avisoReasignacion(
  g: GrupoResponsableOpcion | undefined,
  ambito: Pick<PendienteAmbito, "audiencia" | "grupos" | "nombre"> | undefined,
): string | null {
  if (!g) return null
  if (!enAudienciaDelAmbito(g, ambito))
    return `"${g.nombre}" ya no está en la audiencia del ámbito ${ambito?.nombre ?? ""}: `
      + `así no se puede guardar. Elegí otro grupo o "Sin grupo".`
  return avisoGrupoResponsable(g)
}
