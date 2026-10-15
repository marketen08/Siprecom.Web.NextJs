"use client"

import { useState } from "react"
import { Filter, Loader2, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useGetElementosEnMaqueta } from "../api/use-ifc-entidades"
import { isFiltroVacio, type ElementoEnMaqueta, type FiltroVisor } from "../types"

interface Props {
  proyectoId: string | null
  archivoId: string | null
  /** Disparado al clickear una fila — el caller resalta/encuadra el elemento en el visor 3D. */
  onSeleccionar?: (elemento: ElementoEnMaqueta) => void
  /** Id del elemento actualmente resaltado (para feedback visual en la fila). */
  elementoSeleccionadoId?: string | null
  /**
   * Filtro visual del visor. La lista se restringe a lo que está resaltado en
   * pantalla — si el usuario filtró por subsistema o estado, el panel muestra
   * ese subconjunto y no todo el proyecto.
   */
  filtroVisor?: FiltroVisor | null
}

/**
 * Panel de Elementos de la maqueta. Permite buscar y, al clickear, ubicar/resaltar
 * TODAS las piezas 3D vinculadas a ese elemento. Es la vista por defecto (los
 * elementos son la unidad de negocio; las entidades IFC son piezas).
 *
 * Lista solo elementos CON geometría en el archivo y respeta el filtro del visor,
 * para que la tabla y la maqueta muestren siempre el mismo subconjunto.
 */
export function ElementosPanel({
  proyectoId, archivoId, onSeleccionar, elementoSeleccionadoId, filtroVisor,
}: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 50

  function handleBusqueda(v: string) { setBusqueda(v); setPage(1) }

  const filtroActivo = Boolean(filtroVisor && !isFiltroVacio(filtroVisor))

  // Al cambiar el filtro del visor la paginación queda desfasada: volvemos a 1
  // para no caer en una página vacía. Se ajusta DURANTE el render (patrón de
  // "estado derivado") y no en un efecto: así no hay un render intermedio
  // pidiendo una página que ya no existe.
  const filtroKey = JSON.stringify(filtroVisor ?? null)
  const [filtroKeyPrevia, setFiltroKeyPrevia] = useState(filtroKey)
  if (filtroKeyPrevia !== filtroKey) {
    setFiltroKeyPrevia(filtroKey)
    setPage(1)
  }

  const { data, isLoading, isFetching } = useGetElementosEnMaqueta(
    proyectoId, archivoId, filtroActivo ? filtroVisor! : null, busqueda, page, pageSize,
  )

  const items = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            Elementos de la maqueta
            {filtroActivo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                <Filter className="h-2.5 w-2.5" /> filtrados
              </span>
            )}
          </h2>
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
            {filtroActivo
              ? "Ningún elemento del filtro actual tiene piezas en la maqueta."
              : "Sin resultados."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">TAG</th>
                <th className="text-left px-3 py-2 font-medium">Subsistema</th>
                <th className="text-left px-3 py-2 font-medium">Nombre</th>
                <th className="text-right px-3 py-2 font-medium">Piezas</th>
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
                  {/* Cuántas piezas 3D se van a resaltar al clickear la fila. */}
                  <td className="px-3 py-1.5 text-right text-xs text-gray-500 tabular-nums">
                    {el.piezas.toLocaleString("es-AR")}
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
