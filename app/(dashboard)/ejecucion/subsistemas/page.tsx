"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Fragment, Suspense, useMemo, useState } from "react"
import { AlertCircle, ChevronDown, ChevronRight, Layers, ListChecks, MapPin, MoreHorizontal } from "lucide-react"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { useGetAvanceSistema } from "@/features/avance/api/use-get-avance-sistema"
import type { AvanceSubSistemaDTO } from "@/features/avance/types"
import { NivelesDetalle, ProximaMetaCelda } from "@/features/avance/components/niveles-cells"
import { diasHasta, proximaMeta } from "@/features/avance/lib/niveles"
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

  // sistemaNombre existe nativo en AvanceSubSistemaDTO (para el endpoint de detalle);
  // en las listas de sistema/proyecto lo poblamos manualmente para mostrarlo en la
  // columna "Sistema" cuando el usuario ve todos los subsistemas del proyecto.
  const subsistemas: AvanceSubSistemaDTO[] = sistemaId
    ? (avanceSistema?.subSistemas ?? [])
    : (avanceProyecto?.sistemas ?? []).flatMap((s) =>
        s.subSistemas.map((ss) => ({ ...ss, sistemaNombre: s.nombre }))
      )

  // Filtro por urgencia de la próxima meta. Cuando el filtro es "vencidos" o
  // "proximos", además ordena por fechaFin ascendente para atender lo más urgente
  // primero. El orden por código se preserva en los otros casos.
  type FiltroUrgencia = "todos" | "vencidos" | "proximos" | "completos" | "sin_plan"
  const [filtroUrgencia, setFiltroUrgencia] = useState<FiltroUrgencia>("todos")

  const conteoUrgencia = useMemo(() => {
    let vencidos = 0, proximos = 0, completos = 0, sinPlan = 0
    for (const ss of subsistemas) {
      const meta = proximaMeta(ss.niveles)
      if (meta) {
        const dias = diasHasta(meta.fechaFin)
        if (dias != null && dias < 0) vencidos++
        else if (dias != null && dias <= 15) proximos++
      } else if ((ss.niveles?.length ?? 0) > 0) {
        completos++
      } else {
        sinPlan++
      }
    }
    return { vencidos, proximos, completos, sinPlan }
  }, [subsistemas])

  const subsistemasFiltrados = useMemo(() => {
    if (filtroUrgencia === "todos") return subsistemas
    const filtrados = subsistemas.filter((ss) => {
      const meta = proximaMeta(ss.niveles)
      if (filtroUrgencia === "completos") return !meta && (ss.niveles?.length ?? 0) > 0
      if (filtroUrgencia === "sin_plan") return (ss.niveles?.length ?? 0) === 0
      if (!meta) return false
      const dias = diasHasta(meta.fechaFin)
      if (filtroUrgencia === "vencidos") return dias != null && dias < 0
      if (filtroUrgencia === "proximos") return dias != null && dias >= 0 && dias <= 15
      return true
    })
    if (filtroUrgencia === "vencidos" || filtroUrgencia === "proximos") {
      // Ordenar por fecha fin asc para atender lo más urgente primero.
      filtrados.sort((a, b) => {
        const fa = proximaMeta(a.niveles)?.fechaFin ?? ""
        const fb = proximaMeta(b.niveles)?.fechaFin ?? ""
        return fa.localeCompare(fb)
      })
    }
    return filtrados
  }, [subsistemas, filtroUrgencia])

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
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

      {/* Filtro por urgencia — chips clickeables. Muestra el conteo para que el usuario
          sepa cuánto hay antes de filtrar. Los chips deshabilitados (conteo 0) se atenúan. */}
      <div className="flex items-center gap-2 flex-wrap">
        <ChipUrgencia
          label="Todos"
          active={filtroUrgencia === "todos"}
          count={subsistemas.length}
          onClick={() => setFiltroUrgencia("todos")}
          color="gray"
        />
        <ChipUrgencia
          label="Vencidos"
          active={filtroUrgencia === "vencidos"}
          count={conteoUrgencia.vencidos}
          onClick={() => setFiltroUrgencia("vencidos")}
          color="red"
        />
        <ChipUrgencia
          label="Próximos 15d"
          active={filtroUrgencia === "proximos"}
          count={conteoUrgencia.proximos}
          onClick={() => setFiltroUrgencia("proximos")}
          color="amber"
        />
        <ChipUrgencia
          label="Completos"
          active={filtroUrgencia === "completos"}
          count={conteoUrgencia.completos}
          onClick={() => setFiltroUrgencia("completos")}
          color="green"
        />
        <ChipUrgencia
          label="Sin planificación"
          active={filtroUrgencia === "sin_plan"}
          count={conteoUrgencia.sinPlan}
          onClick={() => setFiltroUrgencia("sin_plan")}
          color="gray"
        />
      </div>

      {/* Cards (solo mobile) */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : subsistemasFiltrados.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            No hay subsistemas con datos de avance.
          </div>
        ) : (
          subsistemasFiltrados.map((ss) => (
            <div
              key={ss.id}
              className="rounded-lg border bg-white p-3 space-y-2 active:bg-blue-50 transition-colors"
              onClick={() => router.push(`/ejecucion/subsistemas/${ss.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">{ss.codigo}</p>
                  <p className="font-medium truncate">{ss.nombre}</p>
                  {!sistemaId && ss.sistemaNombre && (
                    <p className="text-xs text-gray-500 truncate">{ss.sistemaNombre}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                  <EstadosPopover avance={ss} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      title="Acciones"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer bg-transparent border-0 p-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => router.push(`/ejecucion/elementos?subSistemaId=${ss.id}`)}
                        className="cursor-pointer"
                      >
                        <Layers className="h-4 w-4" />
                        <span>Ver elementos</span>
                      </DropdownMenuItem>
                      {ss.cantidadPids > 0 && (
                        <DropdownMenuItem
                          onClick={() => router.push(`/ejecucion/subsistemas/${ss.id}`)}
                          className="cursor-pointer"
                        >
                          <MapPin className="h-4 w-4 text-blue-700" />
                          <span>Ver PIDs ({ss.cantidadPids})</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => router.push(`/reporte/listado-indice?subSistemaId=${ss.id}`)}
                        className="cursor-pointer"
                      >
                        <ListChecks className="h-4 w-4" />
                        <span>Listado índice</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/reporte/pendientes?subSistemaId=${ss.id}`)}
                        className="cursor-pointer"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>Listado de pendientes</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <BarraAvance porcentaje={ss.porcentajeAvance} />
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
              <TableHead className="font-semibold text-gray-700">Subsistema</TableHead>
              {!sistemaId && (
                <TableHead className="font-semibold text-gray-700">Sistema</TableHead>
              )}
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 w-52">Próxima meta</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={!sistemaId ? 8 : 7} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : subsistemasFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={!sistemaId ? 8 : 7} className="text-center py-10 text-muted-foreground">
                  No hay subsistemas con datos de avance.
                </TableCell>
              </TableRow>
            ) : (
              subsistemasFiltrados.map((ss) => {
                const abierto = expandidos.has(ss.id)
                const tieneNiveles = (ss.niveles?.length ?? 0) > 0
                const colSpanExp = !sistemaId ? 8 : 7
                return (
                  <Fragment key={ss.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => router.push(`/ejecucion/subsistemas/${ss.id}`)}
                    >
                      <TableCell
                        className="py-3 w-8"
                        onClick={(ev) => { ev.stopPropagation(); if (tieneNiveles) toggleExpandido(ss.id) }}
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
                      <TableCell className="py-3 font-mono text-sm text-gray-600">{ss.codigo}</TableCell>
                      <TableCell className="py-3 font-medium">{ss.nombre}</TableCell>
                      {!sistemaId && (
                        <TableCell className="py-3 text-sm text-gray-500">{ss.sistemaNombre}</TableCell>
                      )}
                      <TableCell className="py-3">
                        <BarraAvance porcentaje={ss.porcentajeAvance} />
                      </TableCell>
                      <TableCell className="py-3" onClick={(ev) => ev.stopPropagation()}>
                        <ProximaMetaCelda niveles={ss.niveles} />
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
                            {ss.cantidadPids > 0 && (
                              <DropdownMenuItem
                                onClick={() => router.push(`/ejecucion/subsistemas/${ss.id}`)}
                                className="cursor-pointer"
                              >
                                <MapPin className="h-4 w-4 text-blue-700" />
                                <span>Ver PIDs ({ss.cantidadPids})</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => router.push(`/reporte/listado-indice?subSistemaId=${ss.id}`)}
                              className="cursor-pointer"
                            >
                              <ListChecks className="h-4 w-4" />
                              <span>Listado índice</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/reporte/pendientes?subSistemaId=${ss.id}`)}
                              className="cursor-pointer"
                            >
                              <AlertCircle className="h-4 w-4" />
                              <span>Listado de pendientes</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {abierto && tieneNiveles && (
                      <TableRow className="bg-gray-50/70">
                        <TableCell colSpan={colSpanExp} className="py-3">
                          <NivelesDetalle niveles={ss.niveles!} />
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

      {/* Total (respeta el filtro; entre paréntesis el total global si difiere). */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {filtroUrgencia === "todos"
            ? `${subsistemas.length} subsistemas`
            : `${subsistemasFiltrados.length} de ${subsistemas.length} subsistemas`}
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

function ChipUrgencia({
  label, count, active, onClick, color,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  color: "gray" | "red" | "amber" | "green"
}) {
  const disabled = count === 0 && !active
  const paletas: Record<typeof color, { activo: string; inactivo: string }> = {
    gray:   { activo: "bg-gray-900 text-white border-gray-900",     inactivo: "border-gray-300 text-gray-700 hover:bg-gray-50" },
    red:    { activo: "bg-red-600 text-white border-red-600",       inactivo: "border-red-200 text-red-700 hover:bg-red-50" },
    amber:  { activo: "bg-amber-600 text-white border-amber-600",   inactivo: "border-amber-200 text-amber-700 hover:bg-amber-50" },
    green:  { activo: "bg-green-600 text-white border-green-600",   inactivo: "border-green-200 text-green-700 hover:bg-green-50" },
  }
  const cls = active ? paletas[color].activo : paletas[color].inactivo
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      <span>{label}</span>
      <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-px text-[10px] font-bold ${active ? "bg-white/20" : "bg-black/5"}`}>
        {count}
      </span>
    </button>
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
