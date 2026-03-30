"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { useGetAvanceSistema } from "@/features/avance/api/use-get-avance-sistema"
import type { AvanceDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function AvanceSubsistemasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sistemaId = searchParams.get("sistemaId") ?? undefined

  const { data: perfil } = useGetPerfil()

  // Si hay sistemaId: traemos solo ese sistema con sus subsistemas
  const { data: avanceSistemaRaw, isLoading: loadingSistema } = useGetAvanceSistema(sistemaId)

  // Si no hay sistemaId: traemos el proyecto entero y aplanamos subsistemas
  const { data: avanceProyectoRaw, isLoading: loadingProyecto } = useGetAvanceProyecto(
    !sistemaId ? perfil?.proyectoId : undefined
  )

  const avanceSistema = avanceSistemaRaw?.data
  const avanceProyecto = avanceProyectoRaw?.data

  const isLoading = sistemaId ? loadingSistema : loadingProyecto

  const subsistemas: (AvanceDTO & { sistemaNombre?: string })[] = sistemaId
    ? (avanceSistema?.subSistemas ?? [])
    : (avanceProyecto?.sistemas ?? []).flatMap((s) =>
        s.subSistemas.map((ss) => ({ ...ss, sistemaNombre: s.nombre }))
      )

  const tituloSistema = sistemaId ? avanceSistema?.nombre : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {sistemaId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-gray-500"
                onClick={() => router.push("/ejecucion/sistemas")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Sistemas
              </Button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {tituloSistema ? `${tituloSistema} — Subsistemas` : "Avance por subsistemas"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Cargando..." : `${subsistemas.length} subsistemas`}
            {sistemaId && avanceSistema && (
              <span className="ml-2 font-medium text-blue-700">
                — Avance: {avanceSistema.porcentajeAvance.toFixed(1)}%
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700 w-24">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">Subsistema</TableHead>
              {!sistemaId && (
                <TableHead className="font-semibold text-gray-700">Sistema</TableHead>
              )}
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
                <TableCell colSpan={!sistemaId ? 10 : 9} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : subsistemas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={!sistemaId ? 10 : 9} className="text-center py-10 text-muted-foreground">
                  No hay subsistemas con datos de avance.
                </TableCell>
              </TableRow>
            ) : (
              subsistemas.map((ss) => (
                <TableRow
                  key={ss.id}
                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => router.push(`/ejecucion/elementos?subSistemaId=${ss.id}`)}
                >
                  <TableCell className="font-mono text-sm text-gray-600">{ss.codigo}</TableCell>
                  <TableCell className="font-medium">{ss.nombre}</TableCell>
                  {!sistemaId && (
                    <TableCell className="text-sm text-gray-500">{(ss as any).sistemaNombre}</TableCell>
                  )}
                  <TableCell>
                    <BarraAvance porcentaje={ss.porcentajeAvance} />
                  </TableCell>
                  <TableCell className="text-center text-sm">{ss.totalTareas}</TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={ss.pendiente} variant="pendiente" />
                  </TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={ss.enProceso} variant="enProceso" />
                  </TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={ss.completado} variant="completado" />
                  </TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={ss.aprobado} variant="aprobado" />
                  </TableCell>
                  <TableCell className="text-center">
                    <EstadoBadge value={ss.rechazado} variant="rechazado" />
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

export default function AvanceSubsistemasPage() {
  return (
    <Suspense>
      <AvanceSubsistemasContent />
    </Suspense>
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
