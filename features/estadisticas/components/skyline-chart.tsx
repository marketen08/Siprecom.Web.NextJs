"use client"

import { Bar, BarChart, CartesianGrid, Label, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { EstadoBarra, SkylineBucket } from "../lib/gantt"

interface Props {
  buckets: SkylineBucket[]
  granularidadLabel?: string
}

const COLOR: Record<EstadoBarra, string> = {
  completado: "#16a34a", // green-600
  en_curso:   "#2563eb", // blue-600
  proximo:    "#f59e0b", // amber-500
  vencido:    "#dc2626", // red-600
  futuro:     "#9ca3af", // gray-400
}

const NOMBRE: Record<EstadoBarra, string> = {
  completado: "Completo",
  en_curso:   "En curso",
  proximo:    "Próximo",
  vencido:    "Vencido",
  futuro:     "Futuro",
}

/**
 * Barras apiladas por bucket temporal (mes/semana). Cada columna muestra la
 * cantidad de combos (subsistema × nivel) cuya FechaFin cae en ese bucket,
 * segmentados por estado real. Es "la carga programada" — donde se ven los
 * picos de trabajo simultáneo y el desvío respecto al plan.
 */
export function SkylineChart({ buckets, granularidadLabel = "mes" }: Props) {
  if (buckets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-gray-50 p-10 text-center text-sm text-muted-foreground">
        No hay hitos programados en el rango.
      </div>
    )
  }

  const maxTotal = Math.max(1, ...buckets.map((b) => b.total))
  const alto = Math.max(280, Math.min(600, buckets.length * 6 + 260))

  // Bucket que contiene "hoy" para dibujar la línea vertical. Con eje X categórico,
  // la ReferenceLine se dibuja centrada en la categoría cuya label pasamos.
  const hoyLabel = (() => {
    const ahora = Date.now()
    for (let i = 0; i < buckets.length; i++) {
      const inicio = buckets[i].ts
      const fin = i < buckets.length - 1 ? buckets[i + 1].ts : Infinity
      if (ahora >= inicio && ahora < fin) return buckets[i].label
    }
    return null
  })()

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs text-muted-foreground mb-2">
        Cada columna cuenta cuántos combos <em>subsistema × nivel</em> tienen su
        fecha de fin planificada en ese {granularidadLabel}. Segmentado por estado real.
      </div>
      <ResponsiveContainer width="100%" height={alto}>
        <BarChart data={buckets} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            interval={0}
            angle={buckets.length > 12 ? -30 : 0}
            textAnchor={buckets.length > 12 ? "end" : "middle"}
            height={buckets.length > 12 ? 55 : 30}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, Math.ceil(maxTotal * 1.1)]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            width={40}
          />
          <Tooltip content={<TooltipCustom />} cursor={{ fill: "rgba(59, 130, 246, 0.05)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="completado" stackId="s" fill={COLOR.completado} name={NOMBRE.completado} radius={[0, 0, 2, 2]} />
          <Bar dataKey="en_curso"   stackId="s" fill={COLOR.en_curso}   name={NOMBRE.en_curso} />
          <Bar dataKey="proximo"    stackId="s" fill={COLOR.proximo}    name={NOMBRE.proximo} />
          <Bar dataKey="vencido"    stackId="s" fill={COLOR.vencido}    name={NOMBRE.vencido} />
          <Bar dataKey="futuro"     stackId="s" fill={COLOR.futuro}     name={NOMBRE.futuro} radius={[2, 2, 0, 0]} />
          {hoyLabel && (
            <ReferenceLine x={hoyLabel} stroke="#2563eb" strokeWidth={2} ifOverflow="visible">
              <Label
                value="hoy"
                position="insideTop"
                offset={6}
                fill="#1d4ed8"
                fontSize={11}
                fontWeight={600}
              />
            </ReferenceLine>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface TooltipEntry {
  name: string
  value: number
  color?: string
  payload?: SkylineBucket
}

function TooltipCustom({ active, payload, label }: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const bucket = payload[0].payload
  return (
    <div className="rounded-md border bg-white shadow-md px-3 py-2 text-xs">
      <div className="font-semibold text-gray-900 mb-1">{label}</div>
      <div className="space-y-0.5">
        {payload
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-gray-700 flex-1">{p.name}</span>
              <span className="font-medium tabular-nums text-gray-900">{p.value}</span>
            </div>
          ))}
      </div>
      {bucket && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center gap-2">
          <span className="text-gray-600 flex-1">Total</span>
          <span className="font-semibold tabular-nums">{bucket.total}</span>
        </div>
      )}
    </div>
  )
}
