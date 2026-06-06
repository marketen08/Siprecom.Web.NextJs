"use client"

import { useEffect, useState } from "react"
import { Link as LinkIcon, Loader2, Search, Unlink, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import type { Elemento } from "@/features/elementos/types"
import {
  useDesvincularIfcEntidad,
  useGetIfcEntidades,
  useVincularIfcEntidad,
} from "../api/use-ifc-entidades"
import { isFiltroVacio, type EntidadFiltro, type FiltroVisor, type ProyectoIfcEntidad } from "../types"

interface Props {
  proyectoId: string
  archivoId: string
  /** Disparado al clickear una fila — el caller resalta en el visor 3D. */
  onSeleccionar?: (entidad: ProyectoIfcEntidad) => void
  /** Id de la entidad actualmente resaltada (para feedback visual en la fila). */
  entidadSeleccionadaId?: string | null
  /**
   * Filtros visuales del visor (Sistema/SubSistema/Especialidad). Si vienen
   * con datos, la lista se restringe a las entidades que cumplen — así la
   * tabla y el visor muestran el mismo subconjunto.
   */
  filtroVisor?: FiltroVisor | null
}

/**
 * Panel de entidades parseadas del IFC. Permite filtrar, buscar y vincular/desvincular
 * manualmente cada entidad a un Elemento del proyecto. Se muestra debajo del visor.
 */
export function EntidadesPanel({
  proyectoId, archivoId, onSeleccionar, entidadSeleccionadaId, filtroVisor,
}: Props) {
  const [filtro, setFiltro] = useState<EntidadFiltro>("todas")
  const [busqueda, setBusqueda] = useState("")
  const [page, setPage] = useState(1)
  const [vinculando, setVinculando] = useState<ProyectoIfcEntidad | null>(null)
  const pageSize = 50

  // Reset de página cuando cambian filtros para no quedar en una página vacía.
  function handleFiltro(f: EntidadFiltro) { setFiltro(f); setPage(1) }
  function handleBusqueda(v: string) { setBusqueda(v); setPage(1) }

  // Si el filtro del visor cambia, reseteamos página.
  const filtroVisorActivo = filtroVisor && !isFiltroVacio(filtroVisor)
  useEffect(() => { setPage(1) }, [
    filtroVisor?.sistemaIds.join(","),
    filtroVisor?.subSistemaIds.join(","),
    filtroVisor?.especialidadIds.join(","),
    filtroVisor?.estadosVisuales.join(","),
    filtroVisor?.ocultarNoVinculadas,
  ])

  const { data, isLoading, isFetching } = useGetIfcEntidades(
    proyectoId, archivoId, filtro, busqueda, page, pageSize,
    filtroVisorActivo ? filtroVisor : null,
  )
  const desvincular = useDesvincularIfcEntidad(proyectoId, archivoId)

  const items = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Entidades del modelo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total.toLocaleString("es-AR")} entidades · vinculá manualmente las que no auto-matchearon por TAG.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(["todas", "vinculadas", "no-vinculadas"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFiltro(f)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                filtro === f
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "todas" ? "Todas" : f === "vinculadas" ? "Vinculadas" : "Sin vincular"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por TAG, nombre o GUID…"
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
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando entidades…
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center italic">
            Sin resultados.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">TAG detectado</th>
                <th className="text-left px-3 py-2 font-medium">Tipo IFC</th>
                <th className="text-left px-3 py-2 font-medium">Nombre</th>
                <th className="text-left px-3 py-2 font-medium">Elemento vinculado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  onClick={() => onSeleccionar?.(it)}
                  className={`border-b last:border-b-0 transition-colors ${
                    onSeleccionar ? "cursor-pointer" : ""
                  } ${
                    entidadSeleccionadaId === it.id
                      ? "bg-blue-50/70 hover:bg-blue-50"
                      : "hover:bg-gray-50/50"
                  }`}
                >
                  <td className="px-3 py-1.5 font-medium text-gray-800">
                    {it.tagDetectado ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">{it.ifcType ?? "—"}</td>
                  <td className="px-3 py-1.5 text-gray-600 truncate max-w-xs" title={it.nombre ?? undefined}>
                    {it.nombre ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-1.5">
                    {it.elementoId ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        it.vinculadoManualmente
                          ? "bg-amber-50 text-amber-700"
                          : "bg-green-50 text-green-700"
                      }`}>
                        {it.elementoTag ?? it.elementoId}
                        {it.vinculadoManualmente && (
                          <span className="text-[10px] uppercase tracking-wide opacity-75">manual</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Sin vincular</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {it.elementoId ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); desvincular.mutate(it.id) }}
                        disabled={desvincular.isPending}
                        className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-1"
                        title="Desvincular"
                      >
                        <Unlink className="h-3.5 w-3.5" /> Desvincular
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setVinculando(it) }}
                        className="text-xs text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        <LinkIcon className="h-3.5 w-3.5" /> Vincular
                      </button>
                    )}
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

      {vinculando && (
        <VincularElementoDialog
          proyectoId={proyectoId}
          archivoId={archivoId}
          entidad={vinculando}
          onClose={() => setVinculando(null)}
        />
      )}
    </div>
  )
}

// ─── Dialog para vincular manualmente ──────────────────────────────────────

function VincularElementoDialog({
  proyectoId, archivoId, entidad, onClose,
}: {
  proyectoId: string
  archivoId: string
  entidad: ProyectoIfcEntidad
  onClose: () => void
}) {
  const [busqueda, setBusqueda] = useState(entidad.tagDetectado ?? "")
  const { data: elementosRaw, isFetching } = useGetElementos({
    nombre: busqueda || undefined,
    pageSize: 20,
    page: 1,
  })
  // El response shape varía según el endpoint — apiClient agrupa en data.
  const elementos: Elemento[] = (elementosRaw as { data?: Elemento[] })?.data ?? []
  const vincular = useVincularIfcEntidad(proyectoId, archivoId)

  async function seleccionar(elementoId: string) {
    await vincular.mutateAsync({ entidadId: entidad.id, elementoId })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Vincular entidad IFC</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <strong>{entidad.tagDetectado ?? entidad.ifcGuid}</strong>
              {entidad.ifcType && <span className="text-gray-400"> · {entidad.ifcType}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar Elemento por TAG o nombre…"
            className="pl-9"
          />
        </div>

        <div className="border rounded-md max-h-72 overflow-y-auto">
          {isFetching && elementos.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Buscando…</div>
          ) : elementos.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center italic">
              Sin resultados — probá otro término.
            </div>
          ) : (
            <ul className="divide-y">
              {elementos.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    disabled={vincular.isPending}
                    onClick={() => seleccionar(e.id)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 disabled:opacity-50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.tag}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.nombre}</p>
                    </div>
                    <LinkIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
