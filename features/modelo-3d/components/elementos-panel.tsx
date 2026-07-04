"use client"

import { useState } from "react"
import { Loader2, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import type { Elemento } from "@/features/elementos/types"

interface Props {
  /** Disparado al clickear una fila — el caller resalta/encuadra el elemento en el visor 3D. */
  onSeleccionar?: (elemento: Elemento) => void
  /** Id del elemento actualmente resaltado (para feedback visual en la fila). */
  elementoSeleccionadoId?: string | null
}

/**
 * Panel de Elementos del proyecto. Permite buscar y, al clickear, ubicar/resaltar
 * TODAS las piezas 3D vinculadas a ese elemento en la maqueta. Es la vista por
 * defecto (los elementos son la unidad de negocio; las entidades IFC son piezas).
 */
export function ElementosPanel({ onSeleccionar, elementoSeleccionadoId }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 50

  function handleBusqueda(v: string) { setBusqueda(v); setPage(1) }

  const { data, isLoading, isFetching } = useGetElementos({
    nombre: busqueda || undefined,
    page,
    pageSize,
  })

  const items = data?.data ?? []
  const total = data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Elementos del proyecto</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total.toLocaleString("es-AR")} elementos · click para ubicar y resaltar sus piezas en la maqueta.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por TAG, nombre o PID…"
          value={busqueda}
          onChange={(e) => handleBusqueda(e.target.value)}
          className="pl-9 h-9"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => handleBusqueda("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="border rounded-md overflow-hidden">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando elementos…
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center italic">
            Sin resultados.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">TAG</th>
                <th className="text-left px-3 py-2 font-medium">Subsistema</th>
                <th className="text-left px-3 py-2 font-medium">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {items.map((el) => (
                <tr
                  key={el.id}
                  onClick={() => onSeleccionar?.(el)}
                  className={`border-b last:border-b-0 transition-colors ${
                    onSeleccionar ? "cursor-pointer" : ""
                  } ${
                    elementoSeleccionadoId === el.id
                      ? "bg-blue-50/70 hover:bg-blue-50"
                      : "hover:bg-gray-50/50"
                  }`}
                >
                  <td className="px-3 py-1.5 font-medium text-gray-800">
                    {el.tag ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">
                    {el.subSistemaCodigo || el.subSistemaNombre
                      ? `${el.subSistemaCodigo ?? ""}${el.subSistemaCodigo && el.subSistemaNombre ? " — " : ""}${el.subSistemaNombre ?? ""}`
                      : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600 truncate max-w-xs" title={el.nombre ?? undefined}>
                    {el.nombre ?? <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginador */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Página {page} de {lastPage} · {total.toLocaleString("es-AR")} resultados
            {isFetching && <Loader2 className="h-3 w-3 animate-spin inline-block ml-2" />}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage || isFetching}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
