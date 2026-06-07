"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { TimelineSemanaDTO } from "../types"

const COLOR_P0   = "#cbd5e1" // slate-300 — baseline (más claro)
const COLOR_PROG = "#64748b" // slate-500 — programado actual (más oscuro)
const COLOR_REAL = "#16a34a" // green-600 — real ejecutado

const config = {
  p0Acum:          { label: "P0 (baseline)",      color: COLOR_P0 },
  programadoAcum:  { label: "Programado actual",  color: COLOR_PROG },
  realAcum:        { label: "Real",               color: COLOR_REAL },
} satisfies ChartConfig

/**
 * Devuelve el lunes de la semana ISO formateado dd/mm.
 * Si el label no matchea formato ISO, devuelve el label original (resiliente).
 */
function lunesDeSemanaIso(label: string): string {
  const m = label.match(/^(\d{4})-W(\d{1,2})$/)
  if (!m) return label
  const year = parseInt(m[1], 10)
  const week = parseInt(m[2], 10)

  // Algoritmo ISO 8601: el primer jueves del año cae en la semana 1.
  // Trabajamos en UTC para evitar drift por timezones.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4DowLunes0 = (jan4.getUTCDay() + 6) % 7 // 0 = lunes
  const lunesSemana1 = new Date(Date.UTC(year, 0, 4 - jan4DowLunes0))
  const lunesTarget = new Date(lunesSemana1.getTime() + (week - 1) * 7 * 86_400_000)

  return lunesTarget.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
}

interface Props {
  semanas: TimelineSemanaDTO[]
  semanaActual?: string
  /** Si false, no se dibuja la línea P0. Default true. */
  mostrarBaseline?: boolean
  /** Proyecto finalizado — esconde la línea "Hoy" (no aporta en proyectos cerrados). */
  proyectoTerminado?: boolean
  /** Última semana con FechaFinalizacion cargada. */
  semanaUltimoRegistro?: string | null
  /** Fin programado actual (Pn) — MAX(FechaPlanificada, ventanas SSN). */
  semanaFinProgramadoActual?: string | null
  /** Fin programado baseline (P0) — MAX del snapshot. Solo si difiere del actual. */
  semanaFinProgramadoBaseline?: string | null
}

export function CurvaSChart({
  semanas,
  semanaActual,
  mostrarBaseline = true,
  proyectoTerminado = false,
  semanaUltimoRegistro = null,
  semanaFinProgramadoActual = null,
  semanaFinProgramadoBaseline = null,
}: Props) {
  if (semanas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center text-sm text-muted-foreground">
        Aún no hay datos suficientes para construir la curva.
      </div>
    )
  }

  // Sólo mostramos P0 si efectivamente alguna semana trae datos (el backend devuelve null
  // cuando el proyecto no tiene SubSistemaNivel cargado).
  const hayBaseline =
    mostrarBaseline && semanas.some((s) => s.p0Acum !== null && s.p0Acum !== undefined)

  // Helper: una semana ISO está dentro del rango de datos del chart.
  const enRango = (sem: string | null | undefined) =>
    !!sem && semanas.some((s) => s.semana === sem)

  // Línea "Hoy": solo si NO está terminado y la semana actual cae en el rango.
  const mostrarHoy = !proyectoTerminado && enRango(semanaActual)

  // Línea "Último registro": solo si difiere de la semana actual (sino se
  // superpondría con la línea Hoy y no se ve).
  const mostrarUltimoRegistro =
    enRango(semanaUltimoRegistro) && semanaUltimoRegistro !== semanaActual

  // Línea "Fin programado actual": siempre que esté en rango.
  const mostrarFinActual = enRango(semanaFinProgramadoActual)

  // Línea "Fin programado baseline": solo si difiere del actual (sino se
  // superpondría) y está en rango.
  const mostrarFinBaseline =
    enRango(semanaFinProgramadoBaseline)
    && semanaFinProgramadoBaseline !== semanaFinProgramadoActual

  return (
    <div className="space-y-3">
      {/* Leyenda HTML — consistente con el resto de los charts */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        {hayBaseline && (
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-6"
              style={{ borderTop: `2px dashed ${COLOR_P0}` }}
            />
            <span className="text-gray-700">P0 (baseline desde SubSistemaNivel)</span>
          </span>
        )}
        <span className="flex items-center gap-2">
          <span
            className="inline-block w-6"
            style={{ borderTop: `2px dashed ${COLOR_PROG}` }}
          />
          <span className="text-gray-700">Programado actual</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-6 rounded-sm"
            style={{ backgroundColor: COLOR_REAL }}
          />
          <span className="text-gray-700">Real (acumulado)</span>
        </span>
      </div>

      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: 360 }}
      >
        <LineChart data={semanas} margin={{ left: 8, right: 24, top: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="semana"
            tickFormatter={(v) => lunesDeSemanaIso(String(v))}
            tick={{ fontSize: 11 }}
            minTickGap={32}
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) =>
                  `Semana del ${lunesDeSemanaIso(String(label))}  ·  ${label}`
                }
              />
            }
          />
          {hayBaseline && (
            <Line
              dataKey="p0Acum"
              type="monotone"
              stroke={COLOR_P0}
              strokeWidth={2}
              strokeDasharray="2 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="programadoAcum"
            type="monotone"
            stroke={COLOR_PROG}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="realAcum"
            type="monotone"
            stroke={COLOR_REAL}
            strokeWidth={2}
            dot={{ r: 2 }}
            isAnimationActive={false}
          />
          {/* Fin programado baseline (P0) — slate-300 dasheado, atrás de todo */}
          {mostrarFinBaseline && (
            <ReferenceLine
              x={semanaFinProgramadoBaseline!}
              stroke={COLOR_P0}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: "Fin P0", position: "top", fill: COLOR_P0, fontSize: 11 }}
            />
          )}
          {/* Fin programado actual (Pn) — slate-500 */}
          {mostrarFinActual && (
            <ReferenceLine
              x={semanaFinProgramadoActual!}
              stroke={COLOR_PROG}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: "Fin programado", position: "top", fill: COLOR_PROG, fontSize: 11 }}
            />
          )}
          {/* Último registro — verde (color de la serie Real) */}
          {mostrarUltimoRegistro && (
            <ReferenceLine
              x={semanaUltimoRegistro!}
              stroke={COLOR_REAL}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: "Último registro", position: "top", fill: COLOR_REAL, fontSize: 11 }}
            />
          )}
          {/* Hoy — rojo, solo si proyecto NO terminado */}
          {mostrarHoy && (
            <ReferenceLine
              x={semanaActual}
              stroke="#dc2626"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: "Hoy", position: "top", fill: "#dc2626", fontSize: 11 }}
            />
          )}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
