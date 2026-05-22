"use client"

import { Cell, Pie, PieChart } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { DistribucionItemDTO } from "../types"

// Paleta de 8 colores, suficiente para la mayoría de los donuts. Si hay más slices
// que colores, se rota — los slices más chicos suelen ser los que repiten color.
const PALETA = [
  "#2563eb", // blue-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#dc2626", // red-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#ea580c", // orange-600
  "#64748b", // slate-500
]

interface Props {
  titulo: string
  descripcion?: string
  data: DistribucionItemDTO[]
  loading?: boolean
}

export function DonutDistribucion({ titulo, descripcion, data, loading }: Props) {
  const items = data.map((d, i) => ({ ...d, color: PALETA[i % PALETA.length] }))
  const total = items.reduce((acc, d) => acc + d.count, 0)

  const config = items.reduce<ChartConfig>((acc, item) => {
    acc[item.key] = { label: item.label, color: item.color }
    return acc
  }, {})

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900">{titulo}</h3>
        {descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>}
      </div>

      {loading ? (
        <div className="h-44 animate-pulse rounded bg-gray-100" />
      ) : items.length === 0 || total === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Sin datos</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-44 w-44 shrink-0">
            <ChartContainer config={config} className="aspect-square h-full w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="label"
                    />
                  }
                />
                <Pie
                  data={items}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {items.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Total en el centro del donut */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold tabular-nums leading-none">{total}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total
                </div>
              </div>
            </div>
          </div>

          {/* Leyenda con conteo y % */}
          <ul className="min-w-0 flex-1 space-y-1">
            {items.map((item) => {
              const pct = total > 0 ? (item.count / total) * 100 : 0
              return (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-700">{item.label}</span>
                  <span className="shrink-0 tabular-nums font-medium text-gray-900">
                    {item.count}
                  </span>
                  <span className="w-10 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
