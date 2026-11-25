"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { Input } from "@/components/ui/input"

/**
 * Elige el tag (elemento) del que cuelga la línea. Busca por tag o nombre entre los
 * elementos del proyecto, sin los sintéticos de los paquetes de prueba.
 */
export function SelectorTag({
  elementoId, tag, onChange, disabled,
}: {
  elementoId: string | null
  tag: string | null
  onChange: (elementoId: string | null, tag: string | null) => void
  disabled?: boolean
}) {
  const [busqueda, setBusqueda] = useState("")
  const [diferida, setDiferida] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setDiferida(busqueda.trim()), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const { data, isFetching } = useGetElementos({ nombre: diferida || undefined, pageSize: 8 })
  const opciones = (data?.data ?? []).filter((e) => !e.esSintetico)

  if (elementoId) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 h-9 text-sm">
        <span className="font-mono font-medium">{tag ?? elementoId}</span>
        {!disabled && (
          <button type="button" className="text-muted-foreground hover:text-foreground" title="Cambiar el tag" onClick={() => onChange(null, null)}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por tag o nombre…" disabled={disabled} />
      <div className="rounded-md border divide-y max-h-56 overflow-y-auto bg-white">
        {isFetching && opciones.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
        ) : opciones.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados.</p>
        ) : opciones.map((e) => (
          <button key={e.id} type="button" className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50"
            onClick={() => { onChange(e.id, e.tag); setBusqueda("") }}>
            <span className="font-mono font-medium">{e.tag}</span>
            <span className="text-xs text-muted-foreground ml-2">{e.nombre}{e.elementoTipoNombre ? ` · ${e.elementoTipoNombre}` : ""}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
