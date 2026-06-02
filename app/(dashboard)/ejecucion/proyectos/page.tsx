"use client"

import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"

import { useGetAvanceProyectos } from "@/features/avance/api/use-get-avance-proyectos"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useCambiarProyectoActivo } from "@/features/auth/api/use-cambiar-proyecto-activo"
import type { AvanceDTO } from "@/features/avance/types"
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

export default function AvanceProyectosPage() {
  const router = useRouter()
  const { data: avanceData, isLoading } = useGetAvanceProyectos()
  const { data: perfil } = useGetPerfil()
  const cambiarProyecto = useCambiarProyectoActivo()

  const proyectos: AvanceDTO[] = avanceData?.data ?? []
  const proyectoActivoId = perfil?.proyectoId ?? null

  useBreadcrumb([{ label: "Ejecución" }, { label: "Avance por proyectos" }])

  // Al clickear un proyecto: si ya es el activo, solo redirigimos. Si no, lo activamos
  // y después navegamos. Manejamos el await para que el cache se invalide antes.
  async function handleSelectProyecto(proyectoId: string) {
    if (cambiarProyecto.isPending) return
    if (proyectoId !== proyectoActivoId) {
      try {
        await cambiarProyecto.mutateAsync(proyectoId)
      } catch {
        // si falla, no navegamos
        return
      }
    }
    router.push("/ejecucion/sistemas")
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700 w-8"></TableHead>
              <TableHead className="font-semibold text-gray-700">Proyecto</TableHead>
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Cargando proyectos...
                </TableCell>
              </TableRow>
            ) : proyectos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No tenés proyectos asignados.
                </TableCell>
              </TableRow>
            ) : (
              proyectos.map((p) => {
                const esActivo = p.id === proyectoActivoId
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleSelectProyecto(p.id)}
                  >
                    <TableCell className="py-3 text-center">
                      {esActivo && <Check className="h-4 w-4 text-blue-700 inline" />}
                    </TableCell>
                    <TableCell className="py-3 font-medium">{p.nombre}</TableCell>
                    <TableCell className="py-3">
                      <BarraAvance porcentaje={p.porcentajeAvance} />
                    </TableCell>
                    <TableCell className="py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                      <EstadosPopover avance={p} />
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
          {`${proyectos.length} proyecto${proyectos.length !== 1 ? "s" : ""}`}
          {cambiarProyecto.isPending && (
            <span className="ml-2 inline-flex items-center gap-1 text-blue-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cambiando proyecto activo...
            </span>
          )}
        </p>
      )}
    </div>
  )
}
