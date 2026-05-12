"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { AvanceProyectoDTO } from "@/features/avance/types"

interface Props {
  avance: AvanceProyectoDTO
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

export function AvanceSubsistemasChart({ avance }: Props) {
  const data = avance.sistemas.flatMap((s) =>
    (s.subSistemas ?? []).map((ss) => ({
      key: ss.id,
      codigo: ss.codigo,
      nombre: ss.nombre,
      sistemaCodigo: s.codigo,
      pct: ss.porcentajeAvance,
      totalTareas: ss.totalTareas,
    }))
  )

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center text-sm text-muted-foreground">
        No hay subsistemas para mostrar.
      </div>
    )
  }

  // 28px por barra + márgenes. Para 50 subsistemas → ~1500px, scroll en el contenedor padre.
  const height = Math.max(280, data.length * 28 + 60)

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
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_label, payload) => {
                const item = payload?.[0]?.payload as
                  | (typeof data)[number]
                  | undefined
                if (!item) return ""
                return `${item.codigo} — ${item.nombre}`
              }}
              formatter={(value, _name, item) => {
                const raw = item?.payload as (typeof data)[number] | undefined
                return [
                  `${value}%  ·  ${raw?.totalTareas ?? 0} tareas`,
                  "Avance",
                ]
              }}
            />
          }
        />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.key} fill={colorPorAvance(d.pct)} />
          ))}
          <LabelList
            dataKey="pct"
            position="right"
            formatter={(v) => `${v}%`}
            style={{ fontSize: 11, fill: "#374151" }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
