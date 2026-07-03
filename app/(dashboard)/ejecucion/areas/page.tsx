"use client"

import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight, MapPin } from "lucide-react"

import { useGetAvancePorAreas } from "@/features/avance/api/use-get-avance-areas"
import type { AvanceAgrupacionDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { NivelesDetalle, ProximaMetaCelda } from "@/features/avance/components/niveles-cells"

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export default function AvanceAreasPage() {
  const { data, isLoading } = useGetAvancePorAreas()
  const areas: AvanceAgrupacionDTO[] = data?.data ?? []

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Cards (solo mobile) */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : areas.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            No hay áreas con datos. Definí áreas en Alcance → Áreas y asigná elementos.
          </div>
        ) : (
          areas.map((a) => (
            <div key={a.id} className="rounded-lg border bg-white p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">{a.codigo}</p>
                  <p className="font-medium truncate">{a.nombre}</p>
                  <p className="text-xs text-gray-500">{a.cantidadElementos} elemento(s)</p>
                </div>
                <div className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
                  <EstadosPopover avance={a} />
                </div>
              </div>
              <BarraAvance porcentaje={a.porcentajeAvance} />
            </div>
          ))
        )}
      </div>

      {/* Tabla (solo desktop) */}
      <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-semibold text-gray-700 w-32">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-700" />
                  Área
                </div>
              </TableHead>
              <TableHead className="font-semibold text-gray-700 w-28 text-right">Elementos</TableHead>
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 w-52">Próxima meta</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : areas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No hay áreas con datos. Definí áreas en Alcance → Áreas y asigná elementos.
                </TableCell>
              </TableRow>
            ) : (
              areas.map((a) => {
                const tieneNiveles = (a.niveles?.length ?? 0) > 0
                const abierto = expandidos.has(a.id)
                return (
                  <Fragment key={a.id}>
                    <TableRow className="hover:bg-blue-50 transition-colors">
                      <TableCell
                        className="py-3 w-8"
                        onClick={() => { if (tieneNiveles) toggleExpandido(a.id) }}
                      >
                        {tieneNiveles && (
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 text-gray-500"
                            aria-label={abierto ? "Colapsar" : "Expandir"}
                          >
                            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm text-gray-600">{a.codigo}</TableCell>
                      <TableCell className="py-3">
                        <div className="font-medium">{a.nombre}</div>
                        {a.descripcion && (
                          <div className="text-xs text-muted-foreground truncate max-w-md">{a.descripcion}</div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm tabular-nums text-gray-600">
                        {a.cantidadElementos}
                      </TableCell>
                      <TableCell className="py-3">
                        <BarraAvance porcentaje={a.porcentajeAvance} />
                      </TableCell>
                      <TableCell className="py-3">
                        <ProximaMetaCelda niveles={a.niveles} />
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <EstadosPopover avance={a} />
                      </TableCell>
                    </TableRow>
                    {abierto && tieneNiveles && (
                      <TableRow className="bg-gray-50/70">
                        <TableCell colSpan={7} className="py-3">
                          <NivelesDetalle niveles={a.niveles!} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {areas.length} área(s)
        </p>
      )}
    </div>
  )
}
