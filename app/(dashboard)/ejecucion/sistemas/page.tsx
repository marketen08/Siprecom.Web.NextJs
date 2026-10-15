"use client"

import { useRouter } from "next/navigation"
import { Fragment, useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import type { AvanceSistemaDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { NivelesDetalle, ProximaMetaCelda } from "@/features/avance/components/niveles-cells"
import { agregarNivelesPorSistema } from "@/features/avance/lib/niveles"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function AvanceSistemasPage() {
  const router = useRouter()
  const { data: perfil } = useGetPerfil()
  const { data, isLoading } = useGetAvanceProyecto(perfil?.proyectoId)
  const { data: proyectoRaw } = useGetProyecto(perfil?.proyectoId ?? null)
  const proyecto = proyectoRaw?.data

  const avance = data?.data
  const sistemas: AvanceSistemaDTO[] = avance?.sistemas ?? []

  // Niveles agregados por sistema (uno por nivel, con rango de fechas y avance sumado).
  // Se calculan una sola vez por cambio de payload — memoizado.
  const nivelesPorSistema = useMemo(() => {
    const map = new Map<string, ReturnType<typeof agregarNivelesPorSistema>>()
    for (const s of sistemas) map.set(s.id, agregarNivelesPorSistema(s))
    return map
  }, [sistemas])

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  useBreadcrumb(
    proyecto
      ? [{ label: "Ejecución" }, { label: proyecto.nombre }]
      : null
  )

  return (
    <div className="space-y-4">
      {proyecto && avance && (
        <AvanceProyectoCard
          nombre={proyecto.nombre}
          porcentaje={avance.porcentajeAvance}
        />
      )}

      {/* Cards (solo mobile) */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : sistemas.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            No hay sistemas con datos de avance.
          </div>
        ) : (
          sistemas.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border bg-white p-3 space-y-2 active:bg-blue-50 transition-colors"
              onClick={() => router.push(`/ejecucion/subsistemas?sistemaId=${s.id}`)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">{s.codigo}</p>
                  <p className="font-medium truncate">{s.nombre}</p>
                </div>
                <div onClick={(ev) => ev.stopPropagation()} className="shrink-0">
                  <EstadosPopover avance={s} />
                </div>
              </div>
              <BarraAvance porcentaje={s.porcentajeAvance} />
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
              <TableHead className="font-semibold text-gray-700 w-24">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">Sistema</TableHead>
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 w-52">Próxima meta</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : sistemas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No hay sistemas con datos de avance.
                </TableCell>
              </TableRow>
            ) : (
              sistemas.map((s) => {
                const niveles = nivelesPorSistema.get(s.id) ?? []
                const tieneNiveles = niveles.length > 0
                const abierto = expandidos.has(s.id)
                return (
                  <Fragment key={s.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => router.push(`/ejecucion/subsistemas?sistemaId=${s.id}`)}
                    >
                      <TableCell
                        className="py-3 w-8"
                        onClick={(ev) => { ev.stopPropagation(); if (tieneNiveles) toggleExpandido(s.id) }}
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
                      <TableCell className="py-3 font-mono text-sm text-gray-600">{s.codigo}</TableCell>
                      <TableCell className="py-3 font-medium">{s.nombre}</TableCell>
                      <TableCell className="py-3">
                        <BarraAvance porcentaje={s.porcentajeAvance} />
                      </TableCell>
                      <TableCell className="py-3" onClick={(ev) => ev.stopPropagation()}>
                        <ProximaMetaCelda niveles={niveles} />
                      </TableCell>
                      <TableCell className="py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                        <EstadosPopover avance={s} />
                      </TableCell>
                    </TableRow>
                    {abierto && tieneNiveles && (
                      <TableRow className="bg-gray-50/70">
                        <TableCell colSpan={6} className="py-3">
                          <NivelesDetalle niveles={niveles} />
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

      {/* Total */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {`${sistemas.length} sistemas`}
        </p>
      )}
    </div>
  )
}

function AvanceProyectoCard({
  nombre,
  porcentaje,
}: {
  nombre: string
  porcentaje: number
}) {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="text-center text-sm font-semibold text-gray-700">
        PROYECTO: {nombre}
      </div>
      <BarraAvance porcentaje={porcentaje} size="lg" />
    </div>
  )
}
