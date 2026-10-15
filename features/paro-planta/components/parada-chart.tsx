"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ParadaSerie } from "../types"

/**
 * Paleta validada con el validador de la skill de dataviz, en claro y en oscuro:
 * separación CVD ΔE 30.3 (deuteranopía) y 33.3 en visión normal, ambos colores
 * dentro de la banda de luminosidad y por encima del piso de croma.
 *
 * El verde para "real" viene de la curva S de avance programado, donde ya
 * significa lo mismo. El esperado va en azul y no en gris: acá no es una
 * referencia tenue sino la serie contra la que se compara todo el tiempo — el
 * delta entre las dos ES el KPI principal. Igual va punteada, que suma una
 * codificación no cromática para el caso tritan, el más flojo del par.
 */
const COLOR_REAL = "#16a34a"
const COLOR_ESPERADO = "#2563eb"

const config = {
  realP: { label: "Real", color: COLOR_REAL },
  esperadoP: { label: "Esperado", color: COLOR_ESPERADO },
} satisfies ChartConfig

function formatearHora(iso: string, pasoHoras: number): string {
  const d = new Date(iso)
  // Con paso de un día o más la hora no aporta y satura el eje.
  if (pasoHoras >= 24) {
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
  }
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface Props {
  serie: ParadaSerie
  /** Momento de evaluación: dibuja la línea de referencia "ahora". */
  ahora: string
  /** Fin planificado: la línea de meta. */
  finPlan: string
}

export function ParadaChart({ serie, ahora, finPlan }: Props) {
  const datos = serie.puntos.map((p) => ({
    hora: p.hora,
    // Recharts corta la línea en null, que es justo lo que queremos para el
    // futuro: sin dato, sin línea.
    realP: p.realP === null ? null : p.realP * 100,
    esperadoP: p.esperadoP * 100,
  }))

  // El tick de "ahora" tiene que existir en el eje para que la ReferenceLine caiga
  // donde corresponde: con eje de categorías, un valor que no está en los datos no
  // se dibuja. Buscamos el punto más cercano.
  const horaMasCercana = (objetivo: string): string | undefined => {
    const t = new Date(objetivo).getTime()
    let mejor: string | undefined
    let mejorDist = Number.POSITIVE_INFINITY
    for (const p of serie.puntos) {
      const d = Math.abs(new Date(p.hora).getTime() - t)
      if (d < mejorDist) {
        mejorDist = d
        mejor = p.hora
      }
    }
    return mejor
  }

  const tickAhora = horaMasCercana(ahora)
  const tickFinPlan = horaMasCercana(finPlan)

  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />

        <XAxis
          dataKey="hora"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={48}
          tickFormatter={(v: string) => formatearHora(v, serie.pasoHoras)}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          width={44}
        />

        {/* La meta primero para que quede por debajo de "ahora" si coinciden. */}
        {tickFinPlan && (
          <ReferenceLine
            x={tickFinPlan}
            stroke="currentColor"
            className="text-muted-foreground"
            strokeDasharray="4 4"
            label={{ value: "Fin plan", position: "insideTopRight", fontSize: 11, fill: "currentColor" }}
          />
        )}

        {tickAhora && (
          <ReferenceLine
            x={tickAhora}
            stroke="currentColor"
            className="text-foreground"
            strokeWidth={1}
            label={{ value: "Ahora", position: "insideTopLeft", fontSize: 11, fill: "currentColor" }}
          />
        )}

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatearHora(String(v), serie.pasoHoras)}
              formatter={(value, name) => {
                const n = typeof value === "number" ? value : Number(value)
                const etiqueta = name === "realP" ? "Real" : "Esperado"
                return [`${n.toFixed(1)}%`, etiqueta]
              }}
            />
          }
        />

        <Line
          dataKey="esperadoP"
          type="monotone"
          stroke={COLOR_ESPERADO}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
        />

        <Line
          dataKey="realP"
          type="monotone"
          stroke={COLOR_REAL}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
        />

        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  )
}
