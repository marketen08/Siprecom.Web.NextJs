"use client"

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { AvanceSubsistemaFilteredDTO } from "../types"

interface Props {
  data: AvanceSubsistemaFilteredDTO[]
  compact?: boolean
}

const COLOR_COMPLETADO = "#16a34a" // green-600
const COLOR_PENDIENTE  = "#e5e7eb" // gray-200

const config = {
  porcentajeAvance: { label: "Completado" },
  restante:         { label: "Pendiente"  },
} satisfies ChartConfig

export function AvanceSubsistemasChart({ data, compact = false }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center text-sm text-muted-foreground">
        No hay subsistemas para mostrar con los filtros actuales.
      </div>
    )
  }

  // Cada fila lleva ya el complemento — Recharts apila los dos valores.
  const rows = data.map((d) => ({
    ...d,
    restante: Math.max(0, 100 - d.porcentajeAvance),
  }))

  // Altura por barra: 20px en compacto, 28px en estándar.
  const rowHeight = compact ? 20 : 28
  const height = Math.max(280, rows.length * rowHeight + 60)
  const fontSize = compact ? 10 : 11

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ left: 8, right: 48, top: 8, bottom: 8 }}
        barCategoryGap={compact ? 2 : 4}
      >
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="codigo"
          width={140}
          interval={0}
          tick={{ fontSize }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_label, payload) => {
                const item = payload?.[0]?.payload as
                  | (AvanceSubsistemaFilteredDTO & { restante: number })
                  | undefined
                if (!item) return ""
                return `${item.codigo} — ${item.nombre}`
              }}
              formatter={(_value, name, item) => {
                const raw = item?.payload as
                  | (AvanceSubsistemaFilteredDTO & { restante: number })
                  | undefined
                if (!raw) return ["", ""]
                // Mostramos un solo resumen por barra (en el primer segmento) y
                // dejamos el otro sin texto para evitar duplicar la info.
                if (name === "porcentajeAvance") {
                  return [
                    `${raw.porcentajeAvance}%  ·  ${raw.completadas}/${raw.totalTareas} tareas`,
                    "Avance",
                  ]
                }
                return ["", ""]
              }}
            />
          }
        />

        {/* Segmento completado */}
        <Bar
          dataKey="porcentajeAvance"
          stackId="avance"
          fill={COLOR_COMPLETADO}
          isAnimationActive={false}
        />

        {/* Segmento pendiente: gris claro, esquina derecha redondeada para que el stack
            tenga la apariencia de una sola barra */}
        <Bar
          dataKey="restante"
          stackId="avance"
          fill={COLOR_PENDIENTE}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="porcentajeAvance"
            position="right"
            formatter={(v) => `${v}%`}
            style={{ fontSize, fill: "#374151", fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
