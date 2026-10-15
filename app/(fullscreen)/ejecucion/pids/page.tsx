"use client"

import Link from "next/link"
import { FileText, Menu, Search } from "lucide-react"
import { useState, useMemo } from "react"

import { useSidebar } from "@/components/sidebar-context"
import { useGetPids } from "@/features/pids/api/use-get-pids"
import { Input } from "@/components/ui/input"

/**
 * Listado de PIDs pensado para tablet: cards grandes, tap-friendly. Se abre
 * en fullscreen (sin sidebar) y desde acá el operador entra al visor.
 */
export default function PidsEjecucionPage() {
  const { toggle: toggleNav } = useSidebar()
  const { data, isLoading } = useGetPids()
  const [search, setSearch] = useState("")

  const pids = useMemo(() => {
    const raw = data?.data ?? []
    if (!search.trim()) return raw
    const q = search.trim().toLowerCase()
    return raw.filter(
      (p) =>
        p.codigo.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        (p.subSistemaCodigos ?? []).some((c) => c.toLowerCase().includes(q)),
    )
  }, [data, search])

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 4rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 shadow-sm">
        <button
          type="button"
          onClick={toggleNav}
          className="-ml-1 shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Abrir menú"
          title="Menú"
        >
          <Menu className="h-4 w-4" />
        </button>
        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
        <h1 className="text-sm font-semibold text-gray-800">PIDs</h1>
        <div className="ml-auto relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o subsistema…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Cargando PIDs…</p>
        ) : pids.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm">No hay PIDs cargados en este proyecto.</p>
            <p className="text-xs mt-1">
              Un administrador puede subirlos desde <span className="font-mono">Alcance → PIDs</span>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pids.map((pid) => (
              <Link
                key={pid.id}
                href={`/ejecucion/pids/${pid.id}`}
                className="group block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-400 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-blue-700 font-semibold">{pid.codigo}</p>
                    <p className="text-sm font-medium mt-0.5 line-clamp-2">{pid.nombre}</p>
                  </div>
                  {pid.cantidadPendientes > 0 && (
                    <span className="shrink-0 rounded-full bg-red-100 text-red-700 text-xs px-2 py-0.5 font-medium">
                      {pid.cantidadPendientes} pend.
                    </span>
                  )}
                </div>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p>{pid.pageCount} {pid.pageCount === 1 ? "página" : "páginas"}</p>
                  {pid.subSistemaCodigos.length > 0 && (
                    <p className="line-clamp-1">
                      Subsistemas: {pid.subSistemaCodigos.join(", ")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
