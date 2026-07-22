interface BarraAvanceProps {
  porcentaje: number
  showLabel?: boolean
  size?: "sm" | "lg"
}

export function BarraAvance({ porcentaje, showLabel = true, size = "sm" }: BarraAvanceProps) {
  const pct = Math.min(100, Math.max(0, porcentaje))

  const fill =
    pct >= 100 ? "bg-green-500" :
    pct >= 75  ? "bg-blue-500"  :
    pct >= 40  ? "bg-yellow-400" :
                 "bg-orange-400"

  const labelBg =
    pct >= 100 ? "bg-green-700" :
    pct >= 75  ? "bg-blue-700"  :
    pct >= 40  ? "bg-yellow-600" :
                 "bg-orange-600"

  const sizing = size === "lg"
    ? { bar: "h-7", pill: "px-2 py-0.5 text-xs", left: "left-1", decimals: 2 }
    : { bar: "h-5", pill: "px-1.5 py-0.5 text-[10px]", left: "left-0.5", decimals: 1 }

  return (
    <div className={`relative ${sizing.bar} bg-gray-100 rounded-full overflow-hidden`}>
      <div
        className={`absolute inset-y-0 left-0 ${fill} transition-all`}
        style={{ width: `${pct}%` }}
      />
      {showLabel && (
        <span
          className={`absolute ${sizing.left} top-1/2 -translate-y-1/2 ${labelBg} ${sizing.pill} rounded-full font-bold text-white tabular-nums whitespace-nowrap leading-none`}
        >
          {pct.toFixed(sizing.decimals)}%
        </span>
      )}
    </div>
  )
}
