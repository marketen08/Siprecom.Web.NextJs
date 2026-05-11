"use client"

import { useRouter } from "next/navigation"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import type { AvanceSistemaDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
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

  // Breadcrumb dinámico: Ejecución → {Nombre del proyecto}. Sin proyecto cargado,
  // se usa el default del menú (Ejecución → Avance por sistemas).
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

