import type { AvanceSistemaDTO, AvanceSubSistemaDTO, AvanceSubSistemaNivelDTO } from "../types"

/**
 * Primer nivel no completado del subsistema (ordenado por posición del nivel).
 * Es "la próxima meta" del subsistema. Null si todos completos o no hay niveles.
 */
export function proximaMeta(
  niveles: AvanceSubSistemaNivelDTO[] | undefined,
): AvanceSubSistemaNivelDTO | null {
  if (!niveles || niveles.length === 0) return null
  return niveles.find((n) => !n.completado) ?? null
}

/** Días desde hoy hasta la fecha (redondeo por día calendario, zona local). */
export function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return null
  const hoy = new Date()
  const a = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function fmtFecha(f: string | null): string {
  if (!f) return "—"
  const d = new Date(f)
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

/**
 * Agrega los niveles de todos los subsistemas de un sistema en uno solo por nivel.
 * Reglas:
 *  - Rango de fechas: mín(FechaInicio) — máx(FechaFin) entre los subsistemas.
 *  - Total y terminales: se suman. Porcentaje = terminales / total * 100.
 *  - Completado: solo si todos los subsistemas con ese nivel están completos.
 */
export function agregarNivelesPorSistema(
  sistema: AvanceSistemaDTO,
): AvanceSubSistemaNivelDTO[] {
  const porNivel = new Map<string, {
    id: string
    nombre: string
    posicion: number
    fechasInicio: string[]
    fechasFin: string[]
    total: number
    terminales: number
    completadoCount: number
    subCount: number
  }>()

  for (const ss of sistema.subSistemas) {
    for (const n of ss.niveles ?? []) {
      const acc = porNivel.get(n.nivelId) ?? {
        id: n.nivelId,
        nombre: n.nivelNombre,
        posicion: n.nivelPosicion,
        fechasInicio: [],
        fechasFin: [],
        total: 0,
        terminales: 0,
        completadoCount: 0,
        subCount: 0,
      }
      if (n.fechaInicio) acc.fechasInicio.push(n.fechaInicio)
      if (n.fechaFin) acc.fechasFin.push(n.fechaFin)
      acc.total += n.totalTareas
      acc.terminales += n.tareasTerminales
      if (n.completado) acc.completadoCount += 1
      acc.subCount += 1
      porNivel.set(n.nivelId, acc)
    }
  }

  const out: AvanceSubSistemaNivelDTO[] = []
  for (const acc of porNivel.values()) {
    const fechaInicio = acc.fechasInicio.length
      ? acc.fechasInicio.reduce((min, f) => (f < min ? f : min))
      : null
    const fechaFin = acc.fechasFin.length
      ? acc.fechasFin.reduce((max, f) => (f > max ? f : max))
      : null
    const porcentaje = acc.total > 0 ? Math.round((acc.terminales / acc.total) * 10000) / 100 : 0
    out.push({
      nivelId: acc.id,
      nivelNombre: acc.nombre,
      nivelPosicion: acc.posicion,
      fechaInicio,
      fechaFin,
      totalTareas: acc.total,
      tareasTerminales: acc.terminales,
      porcentajeAvance: porcentaje,
      completado: acc.subCount > 0 && acc.completadoCount === acc.subCount,
    })
  }
  out.sort((a, b) => a.nivelPosicion - b.nivelPosicion)
  return out
}

/** Los subsistemas del sistema que tienen datos de nivel (para el detalle expandido). */
export function subsistemasConNiveles(
  sistema: AvanceSistemaDTO,
): AvanceSubSistemaDTO[] {
  return sistema.subSistemas.filter((ss) => (ss.niveles?.length ?? 0) > 0)
}
