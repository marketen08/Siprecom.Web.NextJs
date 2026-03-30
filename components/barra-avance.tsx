interface BarraAvanceProps {
  porcentaje: number
  showLabel?: boolean
}

export function BarraAvance({ porcentaje, showLabel = true }: BarraAvanceProps) {
  const pct = Math.min(100, Math.max(0, porcentaje))

  const color =
    pct >= 100 ? "bg-green-500" :
    pct >= 75  ? "bg-blue-500"  :
    pct >= 40  ? "bg-yellow-400" :
                 "bg-gray-300"

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-600 w-10 text-right tabular-nums">
          {pct.toFixed(1)}%
        </span>
      )}
    </div>
  )
}
