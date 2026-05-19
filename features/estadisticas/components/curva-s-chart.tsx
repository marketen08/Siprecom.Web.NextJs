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
}

export function CurvaSChart({ semanas, semanaActual, mostrarBaseline = true }: Props) {
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

  // Sólo dibujamos la línea "Hoy" si la semana actual cae dentro del rango cargado.
  const mostrarHoy =
    !!semanaActual && semanas.some((s) => s.semana === semanaActual)

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
          {mostrarHoy && (
            <ReferenceLine
              x={semanaActual}
              stroke="#dc2626"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: "Hoy",
                position: "top",
                fill: "#dc2626",
                fontSize: 11,
              }}
            />
          )}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
