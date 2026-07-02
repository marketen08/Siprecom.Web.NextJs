import type { AvanceProyectoDTO, AvanceSistemaDTO, AvanceSubSistemaNivelDTO } from "@/features/avance/types"

/**
 * Una fila del Gantt: la combinación (Sistema, SubSistema, Nivel) con su ventana
 * planificada y el estado del avance. Es lo que renderiza el chart como una barra.
 */
export interface GanttFila {
  sistemaId: string
  sistemaCodigo: string
  sistemaNombre: string
  subSistemaId: string
  subSistemaCodigo: string
  subSistemaNombre: string
  nivelId: string
  nivelNombre: string
  nivelPosicion: number
  fechaInicio: string | null
  fechaFin: string | null
  porcentajeAvance: number
  completado: boolean
  totalTareas: number
  tareasTerminales: number
}

/** Aplana un AvanceProyectoDTO en la lista de filas para el Gantt. Solo incluye
 *  combos que tienen al menos una fecha planificada (sin fechas no aparecen en Y). */
export function proyectoToGanttFilas(proyecto: AvanceProyectoDTO | undefined): GanttFila[] {
  if (!proyecto) return []
  const filas: GanttFila[] = []
  for (const s of proyecto.sistemas) {
    for (const ss of s.subSistemas) {
      for (const n of ss.niveles ?? []) {
        if (!n.fechaInicio && !n.fechaFin) continue
        filas.push({
          sistemaId: s.id,
          sistemaCodigo: s.codigo,
          sistemaNombre: s.nombre,
          subSistemaId: ss.id,
          subSistemaCodigo: ss.codigo,
          subSistemaNombre: ss.nombre,
          nivelId: n.nivelId,
          nivelNombre: n.nivelNombre,
          nivelPosicion: n.nivelPosicion,
          fechaInicio: n.fechaInicio,
          fechaFin: n.fechaFin,
          porcentajeAvance: Number(n.porcentajeAvance),
          completado: n.completado,
          totalTareas: n.totalTareas,
          tareasTerminales: n.tareasTerminales,
        })
      }
    }
  }
  return filas
}

/** Rango temporal que cubre todas las filas. Extiende un poco a ambos lados
 *  para no cortar barras contra los bordes. */
export function calcularRango(filas: GanttFila[]): { desde: Date; hasta: Date } | null {
  const fechas: Date[] = []
  for (const f of filas) {
    if (f.fechaInicio) fechas.push(new Date(f.fechaInicio))
    if (f.fechaFin) fechas.push(new Date(f.fechaFin))
  }
  if (fechas.length === 0) return null
  const min = new Date(Math.min(...fechas.map((d) => d.getTime())))
  const max = new Date(Math.max(...fechas.map((d) => d.getTime())))
  // Snap al primer día del mes anterior / al último día del mes siguiente.
  const desde = new Date(min.getFullYear(), min.getMonth() - 1, 1)
  const hasta = new Date(max.getFullYear(), max.getMonth() + 2, 0)
  return { desde, hasta }
}

/** Ticks mensuales entre `desde` y `hasta`. Devuelve el porcentaje X para cada marca
 *  de mes, útil para dibujar las líneas verticales del fondo. */
export function ticksMensuales(desde: Date, hasta: Date): Array<{ leftPct: number; label: string; key: string }> {
  const total = hasta.getTime() - desde.getTime()
  if (total <= 0) return []
  const out: Array<{ leftPct: number; label: string; key: string }> = []
  const cur = new Date(desde.getFullYear(), desde.getMonth(), 1)
  const fmt = new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" })
  while (cur <= hasta) {
    const left = ((cur.getTime() - desde.getTime()) / total) * 100
    out.push({
      leftPct: left,
      label: fmt.format(cur).replace(".", ""),
      key: `${cur.getFullYear()}-${cur.getMonth()}`,
    })
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

/** Posición X (0-100%) de una fecha dentro del rango. Clampea a los extremos. */
export function xDeFecha(fecha: string | null, desde: Date, hasta: Date): number | null {
  if (!fecha) return null
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return null
  const total = hasta.getTime() - desde.getTime()
  if (total <= 0) return null
  const pct = ((d.getTime() - desde.getTime()) / total) * 100
  return Math.max(0, Math.min(100, pct))
}

export type EstadoBarra = "completado" | "vencido" | "proximo" | "en_curso" | "futuro"

/**
 * Un bucket temporal del skyline: representa un mes (o semana) y trae la cantidad
 * de combos (subsistema × nivel) cuya FechaFin cae en ese bucket, segmentados por
 * estado real.
 */
export interface SkylineBucket {
  /** Clave estable — usar como key en React. Ej "2026-04" o "2026-W15". */
  key: string
  /** Etiqueta corta para el eje X. Ej "abr 26" / "S15 26". */
  label: string
  /** Timestamp del inicio del bucket, útil para ordenar. */
  ts: number
  completado: number
  en_curso: number
  proximo: number
  vencido: number
  futuro: number
  total: number
}

export type Granularidad = "mes" | "semana"

/** Genera los buckets vacíos entre `desde` y `hasta` para no dejar huecos. */
function generarBuckets(desde: Date, hasta: Date, granularidad: Granularidad): SkylineBucket[] {
  const out: SkylineBucket[] = []
  if (granularidad === "mes") {
    const fmt = new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" })
    const cur = new Date(desde.getFullYear(), desde.getMonth(), 1)
    while (cur <= hasta) {
      out.push({
        key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
        label: fmt.format(cur).replace(".", ""),
        ts: cur.getTime(),
        completado: 0, en_curso: 0, proximo: 0, vencido: 0, futuro: 0, total: 0,
      })
      cur.setMonth(cur.getMonth() + 1)
    }
  } else {
    // Semana ISO (empieza el lunes). Etiqueta "S15 26".
    const cur = new Date(desde)
    // Retroceder al lunes de la semana de `desde`.
    const dia = (cur.getDay() + 6) % 7
    cur.setDate(cur.getDate() - dia)
    cur.setHours(0, 0, 0, 0)
    while (cur <= hasta) {
      const w = semanaIso(cur)
      out.push({
        key: `${cur.getFullYear()}-W${String(w).padStart(2, "0")}`,
        label: `S${w} ${String(cur.getFullYear()).slice(2)}`,
        ts: cur.getTime(),
        completado: 0, en_curso: 0, proximo: 0, vencido: 0, futuro: 0, total: 0,
      })
      cur.setDate(cur.getDate() + 7)
    }
  }
  return out
}

function semanaIso(d: Date): number {
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7))
  const primerJueves = new Date(target.getFullYear(), 0, 4)
  return 1 + Math.round(((target.getTime() - primerJueves.getTime()) / 86400000 - 3 + ((primerJueves.getDay() + 6) % 7)) / 7)
}

function bucketKeyDeFecha(fecha: Date, granularidad: Granularidad): string {
  if (granularidad === "mes") {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
  }
  // Semana ISO: el lunes de esa semana define la key.
  const cur = new Date(fecha)
  const dia = (cur.getDay() + 6) % 7
  cur.setDate(cur.getDate() - dia)
  const w = semanaIso(cur)
  return `${cur.getFullYear()}-W${String(w).padStart(2, "0")}`
}

/**
 * Convierte la lista de filas del Gantt en buckets del skyline agrupando por
 * `FechaFin` (el hito de completar cada combo). Los combos sin FechaFin se
 * descartan.
 */
export function filasToSkyline(
  filas: GanttFila[],
  granularidad: Granularidad,
  rango?: { desde: Date; hasta: Date } | null,
): SkylineBucket[] {
  const fechas = filas
    .filter((f) => !!f.fechaFin)
    .map((f) => new Date(f.fechaFin!))
    .filter((d) => !isNaN(d.getTime()))
  if (fechas.length === 0) return []
  const desde = rango?.desde ?? new Date(Math.min(...fechas.map((d) => d.getTime())))
  const hasta = rango?.hasta ?? new Date(Math.max(...fechas.map((d) => d.getTime())))
  const buckets = generarBuckets(desde, hasta, granularidad)
  const porKey = new Map(buckets.map((b) => [b.key, b]))

  for (const f of filas) {
    if (!f.fechaFin) continue
    const d = new Date(f.fechaFin)
    if (isNaN(d.getTime())) continue
    const key = bucketKeyDeFecha(d, granularidad)
    const b = porKey.get(key)
    if (!b) continue
    const estado = estadoDeBarra(f)
    b[estado] += 1
    b.total += 1
  }
  return buckets
}

/** Estado visual de una barra según su fecha fin, avance y "hoy". */
export function estadoDeBarra(fila: GanttFila): EstadoBarra {
  if (fila.completado || fila.porcentajeAvance >= 100) return "completado"
  const hoy = new Date()
  if (fila.fechaFin) {
    const fin = new Date(fila.fechaFin)
    const dias = Math.round((fin.getTime() - hoy.getTime()) / 86400000)
    if (dias < 0) return "vencido"
    if (dias <= 15) return "proximo"
  }
  const inicio = fila.fechaInicio ? new Date(fila.fechaInicio) : null
  if (inicio && inicio > hoy) return "futuro"
  return "en_curso"
}
