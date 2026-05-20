"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { FileText, MoreHorizontal } from "lucide-react"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { useGetAvanceSistema } from "@/features/avance/api/use-get-avance-sistema"
import type { AvanceSubSistemaDTO } from "@/features/avance/types"
import { fetchPlanoUrl } from "@/features/subsistemas/api/use-subsistema-plano"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  const subsistemas: (AvanceSubSistemaDTO & { sistemaNombre?: string })[] = sistemaId
    ? (avanceSistema?.subSistemas ?? [])
    : (avanceProyecto?.sistemas ?? []).flatMap((s) =>
        s.subSistemas.map((ss) => ({ ...ss, sistemaNombre: s.nombre }))
      )

  // Estado para abrir el plano: se setea con el id en curso para deshabilitar el item
  // mientras se pide la SAS URL. No bloqueamos la página entera porque el click sigue
  // siendo cheap (un GET a /plano/download).
  const [planoOpeningId, setPlanoOpeningId] = useState<string | null>(null)
  const [planoError, setPlanoError] = useState<string | null>(null)

  async function abrirPlano(subSistemaId: string) {
    setPlanoError(null)
    setPlanoOpeningId(subSistemaId)
    try {
      const { url } = await fetchPlanoUrl(subSistemaId)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      setPlanoError((e as Error).message)
    } finally {
      setPlanoOpeningId(null)
    }
  }

  // Breadcrumb dinámico cuando estamos drilldown desde un sistema específico.
  // Cuando el usuario llega sin sistemaId, dejamos que el breadcrumb default del
  // menú haga su trabajo (Home → Ejecución → Avance por subsistemas).
  useBreadcrumb(
    sistemaId && avanceSistema
      ? [
          { label: "Ejecución" },
          { label: "Sistemas", href: "/ejecucion/sistemas" },
          { label: `${avanceSistema.codigo} — ${avanceSistema.nombre}` },
        ]
      : null
  )

  return (
    <div className="space-y-4">
      {sistemaId && avanceSistema && (
        <AvanceSistemaCard
          codigo={avanceSistema.codigo}
          nombre={avanceSistema.nombre}
          porcentaje={avanceSistema.porcentajeAvance}
        />
      )}

      {planoError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {planoError}
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700 w-24">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">Subsistema</TableHead>
              {!sistemaId && (
                <TableHead className="font-semibold text-gray-700">Sistema</TableHead>
              )}
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={!sistemaId ? 6 : 5} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : subsistemas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={!sistemaId ? 6 : 5} className="text-center py-10 text-muted-foreground">
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
                  <TableCell className="py-3 font-mono text-sm text-gray-600">{ss.codigo}</TableCell>
                  <TableCell className="py-3 font-medium">{ss.nombre}</TableCell>
                  {!sistemaId && (
                    <TableCell className="py-3 text-sm text-gray-500">{(ss as any).sistemaNombre}</TableCell>
                  )}
                  <TableCell className="py-3">
                    <BarraAvance porcentaje={ss.porcentajeAvance} />
                  </TableCell>
                  <TableCell className="py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                    <EstadosPopover avance={ss} />
                  </TableCell>
                  <TableCell className="py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        title="Acciones"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer bg-transparent border-0 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          disabled={!ss.tienePlano || planoOpeningId === ss.id}
                          onClick={() => { if (ss.tienePlano) abrirPlano(ss.id) }}
                          className="cursor-pointer"
                        >
                          <FileText className="h-4 w-4" />
                          <span>{planoOpeningId === ss.id ? "Abriendo..." : "Ver plano"}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          {`${subsistemas.length} subsistemas`}
        </p>
      )}
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

function AvanceSistemaCard({
  codigo,
  nombre,
  porcentaje,
}: {
  codigo: string
  nombre: string
  porcentaje: number
}) {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="text-center text-sm font-semibold text-gray-700">
        SISTEMA: {codigo} {nombre}
      </div>
      <BarraAvance porcentaje={porcentaje} size="lg" />
    </div>
  )
}
