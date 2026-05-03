"use client"

import { useRouter } from "next/navigation"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import type { AvanceSistemaDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
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

  const avance = data?.data
  const sistemas: AvanceSistemaDTO[] = avance?.sistemas ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Avance por sistemas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Cargando..." : `${sistemas.length} sistemas`}
          {avance && (
            <span className="ml-2 font-medium text-blue-700">
              — Avance total: {avance.porcentajeAvance.toFixed(1)}%
            </span>
          )}
        </p>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700 w-24">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">Sistema</TableHead>
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : sistemas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No hay sistemas con datos de avance.
                </TableCell>
              </TableRow>
            ) : (
              sistemas.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => router.push(`/ejecucion/subsistemas?sistemaId=${s.id}`)}
                >
                  <TableCell className="py-3 font-mono text-sm text-gray-600">{s.codigo}</TableCell>
                  <TableCell className="py-3 font-medium">{s.nombre}</TableCell>
                  <TableCell className="py-3">
                    <BarraAvance porcentaje={s.porcentajeAvance} />
                  </TableCell>
                  <TableCell className="py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                    <EstadosPopover avance={s} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

