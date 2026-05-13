"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CalendarClock, Settings2 } from "lucide-react"
import Link from "next/link"

import { useGetEstimacion } from "@/features/planificacion/api/use-planificacion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function fmt(n: number) {
  return n.toLocaleString("es-AR")
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })
  } catch {
    return iso
  }
}

export default function EstimadorPage() {
  // Default: hoy en formato YYYY-MM-DD.
  const hoy = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])

  const [fechaInicio, setFechaInicio] = useState<string>(hoy)
  const { data, isLoading, error, refetch, isFetching } = useGetEstimacion(fechaInicio)
  const est = data?.data

  const margenColor = (() => {
    if (!est || est.diasDeMargen === null || est.diasDeMargen === undefined) return "text-gray-500"
    if (est.diasDeMargen >= 0) return "text-green-700"
    return "text-red-700"
  })()

  const margenLabel = (() => {
    if (!est || est.diasDeMargen === null || est.diasDeMargen === undefined) return "—"
    const dias = Math.abs(est.diasDeMargen)
    return est.diasDeMargen >= 0
      ? `+${dias} días de margen`
      : `${dias} días de retraso`
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimador de planificación</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calcula cuántos días laborables faltan para terminar el proyecto en base a las
            horas pendientes y la capacidad configurada por especialidad.
          </p>
        </div>
        <Link href="/planificacion/configuracion">
          <Button variant="outline" className="gap-2 shrink-0">
            <Settings2 className="h-4 w-4" />
            Configurar capacidad
          </Button>
        </Link>
      </div>

      {/* Input */}
      <div className="rounded-lg border border-gray-100 bg-white p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Fecha de inicio</label>
          <Input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-1 w-44"
          />
        </div>
        <Button onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <CalendarClock className="h-4 w-4" />
          {isFetching ? "Calculando..." : "Recalcular"}
        </Button>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-gray-100 bg-white p-6 animate-pulse h-72" />
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al calcular la estimación.
        </div>
      )}

      {!isLoading && !error && est && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tareas pendientes
              </div>
              <div className="text-3xl font-bold text-blue-900 tabular-nums">
                {fmt(est.tareasPendientes)}
              </div>
              <div className="text-xs text-muted-foreground">
                Pendientes + en proceso
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Horas pendientes
              </div>
              <div className="text-3xl font-bold text-blue-900 tabular-nums">
                {fmt(Math.round(est.horasPendientesTotal))}
              </div>
              <div className="text-xs text-muted-foreground">Suma de horas estimadas</div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Días necesarios
              </div>
              <div className="text-3xl font-bold text-blue-900 tabular-nums">
                {fmt(est.diasLaborablesNecesarios)}
              </div>
              <div className="text-xs text-muted-foreground">
                Cuello de botella entre especialidades
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fin estimado
              </div>
              <div className="text-3xl font-bold text-blue-900 tabular-nums">
                {fmtFecha(est.fechaFinEstimada)}
              </div>
              <div className={`text-xs font-medium ${margenColor}`}>
                {est.fechaFinPlanificada
                  ? `vs ${fmtFecha(est.fechaFinPlanificada)} · ${margenLabel}`
                  : "(sin fecha planificada)"}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {est.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Atención
              </div>
              <ul className="text-sm text-amber-800 space-y-0.5 list-disc list-inside">
                {est.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Desglose por especialidad */}
          <div className="rounded-lg border border-gray-100 bg-white p-4 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Desglose por especialidad</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Las especialidades trabajan en paralelo: el total de días necesarios es el de la
                que más demora (cuello de botella).
              </p>
            </div>

            {est.porEspecialidad.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Sin tareas pendientes para mostrar.
              </div>
            ) : (
              <div className="space-y-2">
                {est.porEspecialidad.map((e) => {
                  const esBottleneck =
                    !e.sinCapacidadConfigurada
                    && e.diasNecesarios === est.diasLaborablesNecesarios
                    && e.diasNecesarios > 0

                  return (
                    <div
                      key={e.especialidadId}
                      className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg border ${
                        esBottleneck
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {e.especialidadColor && (
                          <span
                            className="inline-block h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: e.especialidadColor }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {e.especialidadCodigo
                              ? `${e.especialidadCodigo} — ${e.especialidadNombre}`
                              : e.especialidadNombre}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {fmt(e.tareasPendientes)} tareas · {fmt(Math.round(e.horasPendientes))} h
                            {e.sinCapacidadConfigurada
                              ? " · sin capacidad"
                              : ` · ${e.horasPorDia} h/día`}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {e.sinCapacidadConfigurada ? (
                          <span className="text-sm font-medium text-amber-700">
                            Configurar capacidad
                          </span>
                        ) : (
                          <>
                            <div className="text-lg font-bold tabular-nums text-gray-900">
                              {fmt(e.diasNecesarios)} días
                            </div>
                            {esBottleneck && (
                              <div className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold">
                                Cuello de botella
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
