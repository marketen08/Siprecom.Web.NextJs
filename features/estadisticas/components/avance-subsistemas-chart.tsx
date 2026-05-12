"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
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

// Mismos cortes que el badge de riesgo del dashboard.
function colorPorAvance(pct: number) {
  if (pct >= 85) return "#16a34a" // green-600
  if (pct >= 60) return "#eab308" // yellow-500
  if (pct >= 30) return "#f97316" // orange-500
  return "#dc2626"                 // red-600
}

const config = {
  pct: { label: "% Avance" },
} satisfies ChartConfig

export function AvanceSubsistemasChart({ data, compact = false }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center text-sm text-muted-foreground">
        No hay subsistemas para mostrar con los filtros actuales.
      </div>
    )
  }

  // Altura por barra: 20px en compacto, 28px en estándar.
  const rowHeight = compact ? 20 : 28
  const height = Math.max(280, data.length * rowHeight + 60)
  const fontSize = compact ? 10 : 11

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 48, top: 8, bottom: 8 }}
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
                  | AvanceSubsistemaFilteredDTO
                  | undefined
                if (!item) return ""
                return `${item.codigo} — ${item.nombre}`
              }}
              formatter={(value, _name, item) => {
                const raw = item?.payload as
                  | AvanceSubsistemaFilteredDTO
                  | undefined
                return [
                  `${value}%  ·  ${raw?.completadas ?? 0}/${raw?.totalTareas ?? 0} tareas`,
                  "Avance",
                ]
              }}
            />
          }
        />
        <Bar dataKey="porcentajeAvance" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.subSistemaId} fill={colorPorAvance(d.porcentajeAvance)} />
          ))}
          <LabelList
            dataKey="porcentajeAvance"
            position="right"
            formatter={(v) => `${v}%`}
            style={{ fontSize, fill: "#374151" }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
