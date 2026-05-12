"use client"

import { AlertTriangle } from "lucide-react"
import { useGetAvanceTimeline } from "@/features/estadisticas/api/use-get-avance-timeline"
import { CurvaSChart } from "@/features/estadisticas/components/curva-s-chart"

function fmt(n: number) {
  return n.toLocaleString("es-AR")
}

export default function AvanceProgramadoPage() {
  const { data, isLoading, error } = useGetAvanceTimeline()
  const timeline = data?.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Avance programado</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Curva S semanal: tareas programadas vs realmente completadas (acumulado).
        </p>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-gray-100 bg-white p-6 animate-pulse h-96" />
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al cargar la curva de avance.
        </div>
      )}

      {!isLoading && !error && timeline && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total tareas
              </div>
              <div className="text-3xl font-bold text-blue-900 tabular-nums">
                {fmt(timeline.totalTareas)}
              </div>
              <div className="text-xs text-muted-foreground">Excluye canceladas</div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sin programar
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold tabular-nums text-gray-900">
                  {fmt(timeline.tareasSinProgramar)}
                </span>
                {timeline.tareasSinProgramar > 0 && (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Sin FechaPlanificada ni ventana de nivel
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Semanas con actividad
              </div>
              <div className="text-3xl font-bold text-blue-900 tabular-nums">
                {timeline.semanas.length}
              </div>
              <div className="text-xs text-muted-foreground">Rango cubierto por la curva</div>
            </div>
          </div>

          {/* Curva S */}
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <CurvaSChart semanas={timeline.semanas} />
          </div>

          {timeline.tareasSinProgramar > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <strong className="font-semibold">{fmt(timeline.tareasSinProgramar)} tareas</strong>{" "}
                no aparecen en la curva &quot;programado&quot; porque no tienen{" "}
                <code className="rounded bg-amber-100 px-1">FechaPlanificada</code> ni una ventana
                de <code className="rounded bg-amber-100 px-1">SubSistemaNivel</code> cargada para
                su combinación de subsistema y nivel.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
