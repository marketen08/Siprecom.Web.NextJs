"use client"

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ElementosPorSubsistemaDTO } from "../types"

interface Props {
  data: ElementosPorSubsistemaDTO[]
}

const config = {
  cantidad: { label: "Elementos", color: "#2563eb" },
} satisfies ChartConfig

export function CantidadElementosChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center text-sm text-muted-foreground">
        No hay subsistemas para mostrar.
      </div>
    )
  }

  // 28px por barra para que respiren los labels del YAxis.
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
        <XAxis type="number" allowDecimals={false} />
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
                  | ElementosPorSubsistemaDTO
                  | undefined
                if (!item) return ""
                return `${item.codigo} — ${item.nombre}`
              }}
              formatter={(value, _name, item) => {
                const raw = item?.payload as ElementosPorSubsistemaDTO | undefined
                return [
                  `${value} elementos  ·  ${raw?.sistemaCodigo ?? ""}`,
                  "",
                ]
              }}
            />
          }
        />
        <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} fill="#2563eb">
          <LabelList
            dataKey="cantidad"
            position="right"
            style={{ fontSize: 11, fill: "#374151" }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
