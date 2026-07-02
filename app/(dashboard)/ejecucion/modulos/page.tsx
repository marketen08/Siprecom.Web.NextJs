"use client"

import { Box } from "lucide-react"

import { useGetAvancePorModulos } from "@/features/avance/api/use-get-avance-modulos"
import type { AvanceAgrupacionDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

// Marca especial del backend para elementos sin módulo asignado.
const SIN_MODULO = "__sin_modulo__"

export default function AvanceModulosPage() {
  const { data, isLoading } = useGetAvancePorModulos()
  const modulos: AvanceAgrupacionDTO[] = data?.data ?? []

  return (
    <div className="space-y-4">
      {/* Cards (solo mobile) */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : modulos.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            No hay módulos definidos ni elementos sin módulo.
          </div>
        ) : (
          modulos.map((m) => {
            const esSinModulo = m.id === SIN_MODULO
            return (
              <div
                key={m.id}
                className={`rounded-lg border bg-white p-3 space-y-2 ${
                  esSinModulo ? "border-dashed" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-gray-500">{m.codigo}</p>
                    <p className={`font-medium truncate ${esSinModulo ? "italic text-muted-foreground" : ""}`}>
                      {m.nombre}
                    </p>
                    <p className="text-xs text-gray-500">{m.cantidadElementos} elemento(s)</p>
                  </div>
                  <div className="shrink-0">
                    <EstadosPopover avance={m} />
                  </div>
                </div>
                <BarraAvance porcentaje={m.porcentajeAvance} />
              </div>
            )
          })
        )}
      </div>

      {/* Tabla (solo desktop) */}
      <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700 w-32">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">
                <div className="flex items-center gap-1.5">
                  <Box className="h-3.5 w-3.5 text-blue-700" />
                  Módulo
                </div>
              </TableHead>
              <TableHead className="font-semibold text-gray-700 w-28 text-right">Elementos</TableHead>
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : modulos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No hay módulos definidos ni elementos sin módulo.
                </TableCell>
              </TableRow>
            ) : (
              modulos.map((m) => {
                const esSinModulo = m.id === SIN_MODULO
                return (
                  <TableRow
                    key={m.id}
                    className={`hover:bg-blue-50 transition-colors ${esSinModulo ? "bg-muted/20" : ""}`}
                  >
                    <TableCell className="py-3 font-mono text-sm text-gray-600">{m.codigo}</TableCell>
                    <TableCell className="py-3">
                      <div className={`font-medium ${esSinModulo ? "italic text-muted-foreground" : ""}`}>
                        {m.nombre}
                      </div>
                      {m.descripcion && (
                        <div className="text-xs text-muted-foreground truncate max-w-md">{m.descripcion}</div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm tabular-nums text-gray-600">
                      {m.cantidadElementos}
                    </TableCell>
                    <TableCell className="py-3">
                      <BarraAvance porcentaje={m.porcentajeAvance} />
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <EstadosPopover avance={m} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {modulos.filter((m) => m.id !== SIN_MODULO).length} módulo(s)
          {modulos.find((m) => m.id === SIN_MODULO) && " · más elementos sin módulo"}
        </p>
      )}
    </div>
  )
}
