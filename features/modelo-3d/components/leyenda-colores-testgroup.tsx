"use client"

import type { ColoresPorTestGroup } from "../types"
import { TESTGROUP_PALETTE, TESTGROUP_SIN_PACK_COLOR } from "../viewer"

interface Props {
  buckets: ColoresPorTestGroup | null
  loading?: boolean
}

/**
 * Leyenda compacta de colores por TestGroup — overlay del visor cuando el
 * toggle "Colores por pack" está activo. Muestra hasta 12 packs con su color
 * y el conteo de elementos. Si hay más de 12, agrupa el resto en "otros".
 */
export function LeyendaColoresTestGroup({ buckets, loading }: Props) {
  const items = (buckets?.buckets ?? []).map((b, i) => ({
    color: hexColor(TESTGROUP_PALETTE[i % TESTGROUP_PALETTE.length]),
    label: `${b.codigo} · ${b.nombre}`,
    count: b.cantidadElementos,
    tipo: b.tipoTexto,
  }))

  const totalPacks = items.length
  const mostrar = items.slice(0, 12)
  const oculto = items.length - mostrar.length

  return (
    <div className="pointer-events-none rounded-md border border-gray-200 bg-white/95 px-3 py-2 shadow-sm text-xs space-y-2 min-w-64 max-w-80">
      <div className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">
        {loading ? "Cargando packs…" : `Paquetes de prueba${totalPacks > 0 ? ` (${totalPacks})` : ""}`}
      </div>

      {buckets && totalPacks === 0 && !loading && (
        <p className="text-[11px] text-muted-foreground italic">
          No hay paquetes de prueba activos que apliquen al subset actual.
        </p>
      )}

      <ul className="space-y-0.5 max-h-64 overflow-y-auto pointer-events-auto">
        {mostrar.map((it) => (
          <Item key={it.label} color={it.color} label={it.label} count={it.count} tipo={it.tipo} />
        ))}
      </ul>

      {oculto > 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          +{oculto} pack(s) más con colores repetidos (la paleta cicla cada 12).
        </p>
      )}

      {buckets && buckets.sinTestGroupElementos > 0 && (
        <div className="pt-1 border-t border-gray-100">
          <Item
            color={hexColor(TESTGROUP_SIN_PACK_COLOR)}
            label="Sin pack"
            count={buckets.sinTestGroupElementos}
          />
        </div>
      )}

      <p className="hidden text-[10px] text-muted-foreground italic pt-0.5 md:block">
        Un elemento en varios packs se pinta con el primero por tipo/código.
      </p>
    </div>
  )
}

function Item({
  color, label, count, tipo,
}: { color: string; label: string; count?: number; tipo?: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm border border-black/10 shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-700 truncate" title={tipo ? `${label} — ${tipo}` : label}>
        {label}
      </span>
      {typeof count === "number" && (
        <span className="ml-auto text-gray-500 tabular-nums shrink-0">
          {count.toLocaleString("es-AR")}
        </span>
      )}
    </li>
  )
}

function hexColor(v: number): string {
  return `#${v.toString(16).padStart(6, "0")}`
}
