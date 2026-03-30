"use client"

import { useRouter } from "next/navigation"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import type { AvanceSistemaDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700 w-24">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">Sistema</TableHead>
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-20">Total</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Pendiente</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">En proceso</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Completado</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Aprobado</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Rechazado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : sistemas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
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
                  <TableCell className="font-mono text-sm text-gray-600">{s.codigo}</TableCell>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell>
                    <BarraAvance porcentaje={s.porcentajeAvance} />
                  </TableCell>
                  <TableCell className="text-center text-sm">{s.totalTareas}</TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={s.pendiente} variant="pendiente" />
                  </TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={s.enProceso} variant="enProceso" />
                  </TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={s.completado} variant="completado" />
                  </TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={s.aprobado} variant="aprobado" />
                  </TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={s.rechazado} variant="rechazado" />
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

type EstadoVariant = "pendiente" | "enProceso" | "completado" | "aprobado" | "rechazado"

function EstadoBadge({ value, variant }: { value: number; variant: EstadoVariant }) {
  if (value === 0) return <span className="text-sm text-gray-400">—</span>

  const styles: Record<EstadoVariant, string> = {
    pendiente:  "bg-gray-100 text-gray-700",
    enProceso:  "bg-blue-100 text-blue-700",
    completado: "bg-yellow-100 text-yellow-700",
    aprobado:   "bg-green-100 text-green-700",
    rechazado:  "bg-red-100 text-red-700",
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {value}
    </span>
  )
}
