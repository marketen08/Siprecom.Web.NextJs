"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"

import { useGetAvanceProyectos } from "@/features/avance/api/use-get-avance-proyectos"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useCambiarProyectoActivo } from "@/features/auth/api/use-cambiar-proyecto-activo"
import type { AvanceDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import { EstadoBadge, ESTADO_COLORS } from "@/components/estado-proyecto-badge"
import { ESTADO_PROYECTO } from "@/features/proyectos/types"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

/** En curso. Default de la vista: es lo que se está ejecutando hoy. */
const EN_CURSO = "2"

export default function AvanceProyectosPage() {
  const router = useRouter()
  const { data: perfil } = useGetPerfil()
  const cambiarProyecto = useCambiarProyectoActivo()

  // Arranca en "En curso" y no en todos: con los 149 proyectos de Pluspetrol
  // migrados —130 de ellos COMPLETADO— abrir la pantalla en "todos" era ruido
  // histórico. Volver a tocar el chip activo lo apaga y muestra todos.
  const [estado, setEstado] = useState<string>(EN_CURSO)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Filtro y paginación son del SERVIDOR. Antes esta pantalla traía todos los
  // proyectos y filtraba en memoria, y el backend resolvía el avance proyecto por
  // proyecto: ~1.000 queries por carga, que es lo que la dejaba colgada.
  const { data, isLoading, isFetching } = useGetAvanceProyectos({
    estado: estado !== ALL ? Number(estado) : undefined,
    page,
    pageSize,
  })

  const proyectos: AvanceDTO[] = useMemo(() => data?.data?.data ?? [], [data])
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)
  const proyectoActivoId = perfil?.proyectoId ?? null

  useBreadcrumb([{ label: "Ejecución" }, { label: "Avance por proyectos" }])

  // Distinguir "no tenés proyectos" de "el filtro no matcheó": con el mismo cartel,
  // filtrar por un estado sin resultados parecía una pérdida de acceso.
  const mensajeVacio =
    estado !== ALL
      ? "Ningún proyecto con ese estado."
      : "No tenés proyectos asignados."

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
      {/* Mismo patrón que /configuracion/proyectos: los siete estados a la vista,
          un solo criterio a la vez, y el chip prendido es también el botón para
          apagarlo. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Estado:</span>
        {Object.entries(ESTADO_PROYECTO).map(([id, label]) => {
          const activo = estado === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setEstado(activo ? ALL : id); setPage(1) }}
              aria-pressed={activo}
              className={
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer " +
                (activo
                  ? `border-transparent ${ESTADO_COLORS[Number(id)] ?? "bg-gray-100 text-gray-700"}`
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
              }
            >
              {label}
            </button>
          )
        })}
        {isFetching && !isLoading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Cards (solo mobile) */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Cargando proyectos...
          </div>
        ) : proyectos.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            {mensajeVacio}
          </div>
        ) : (
          proyectos.map((p) => {
            const esActivo = p.id === proyectoActivoId
            return (
              <div
                key={p.id}
                className="rounded-lg border bg-white p-3 space-y-2 active:bg-blue-50 transition-colors"
                onClick={() => handleSelectProyecto(p.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {esActivo && <Check className="h-4 w-4 text-blue-700 shrink-0" />}
                    <p className="font-medium truncate">{p.nombre}</p>
                  </div>
                  <div onClick={(ev) => ev.stopPropagation()} className="shrink-0">
                    <EstadosPopover avance={p} />
                  </div>
                </div>
                {p.estado != null && <EstadoBadge estado={p.estado} />}
                <BarraAvance porcentaje={p.porcentajeAvance} />
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
              <TableHead className="font-semibold text-gray-700 w-8"></TableHead>
              <TableHead className="font-semibold text-gray-700">Proyecto</TableHead>
              <TableHead className="font-semibold text-gray-700 w-32">Estado</TableHead>
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Cargando proyectos...
                </TableCell>
              </TableRow>
            ) : proyectos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {mensajeVacio}
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
                      {p.estado != null && <EstadoBadge estado={p.estado} />}
                    </TableCell>
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

      {/* Total + Paginación — mismo patrón que /configuracion/proyectos */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {`${total} proyecto${total !== 1 ? "s" : ""}`}
          {estado !== ALL && ` en ${(ESTADO_PROYECTO[Number(estado) as keyof typeof ESTADO_PROYECTO] ?? "").toLowerCase()}`}
          {cambiarProyecto.isPending && (
            <span className="ml-2 inline-flex items-center gap-1 text-blue-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cambiando proyecto activo...
            </span>
          )}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
