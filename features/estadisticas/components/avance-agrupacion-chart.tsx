"use client"

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { AvanceAgrupacionFilteredDTO } from "../types"

interface Props {
  data: AvanceAgrupacionFilteredDTO[]
  compact?: boolean
  /** Label singular usado en el tooltip ("Área" / "Módulo"). */
  entityLabel: string
  /** Mensaje cuando no hay filas. */
  emptyMessage?: string
}

const COLOR_COMPLETADO = "#16a34a" // green-600
const COLOR_PENDIENTE  = "#e5e7eb" // gray-200

const config = {
  porcentajeAvance: { label: "Completado" },
  restante:         { label: "Pendiente"  },
} satisfies ChartConfig

/**
 * Chart genérico para "avance por agrupación" (Área o Módulo). Reutiliza el layout
 * horizontal apilado de AvanceSubsistemasChart pero opera sobre AvanceAgrupacionFilteredDTO.
 */
export function AvanceAgrupacionChart({
  data, compact = false, entityLabel, emptyMessage,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center text-sm text-muted-foreground">
        {emptyMessage ?? `No hay ${entityLabel.toLowerCase()}s para mostrar con los filtros actuales.`}
      </div>
    )
  }

  const rows = data.map((d) => ({
    ...d,
    restante: Math.max(0, 100 - d.porcentajeAvance),
  }))

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
                  | (AvanceAgrupacionFilteredDTO & { restante: number })
                  | undefined
                if (!item) return ""
                return `${item.codigo} — ${item.nombre}`
              }}
              formatter={(_value, name, item) => {
                const raw = item?.payload as
                  | (AvanceAgrupacionFilteredDTO & { restante: number })
                  | undefined
                if (!raw) return ["", ""]
                if (name === "porcentajeAvance") {
                  return [
                    `${raw.porcentajeAvance}%  ·  ${raw.completadas}/${raw.totalTareas} tareas  ·  ${raw.cantidadElementos} elem.`,
                    "Avance",
                  ]
                }
                return ["", ""]
              }}
            />
          }
        />

        <Bar
          dataKey="porcentajeAvance"
          stackId="avance"
          fill={COLOR_COMPLETADO}
          isAnimationActive={false}
        />

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
