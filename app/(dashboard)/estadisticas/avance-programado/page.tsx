"use client"

import { useState } from "react"
import { AlertTriangle, FileDown, Loader2 } from "lucide-react"
import { useGetAvanceTimeline } from "@/features/estadisticas/api/use-get-avance-timeline"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import { CurvaSChart } from "@/features/estadisticas/components/curva-s-chart"
import { Button } from "@/components/ui/button"

function fmt(n: number) {
  return n.toLocaleString("es-AR")
}

export default function AvanceProgramadoPage() {
  const { data, isLoading, error } = useGetAvanceTimeline()
  const timeline = data?.data

  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function exportarPdf() {
    if (downloading) return
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadPdf("/api/reportes/avance-programado/pdf", "avance-programado.pdf")
    } catch (e) {
      setDownloadError((e as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avance programado</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Curva S semanal: tareas programadas vs realmente completadas (acumulado).
          </p>
        </div>
        <Button variant="outline" onClick={exportarPdf} disabled={downloading} className="gap-2 shrink-0">
          {downloading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <FileDown className="h-4 w-4" />}
          {downloading ? "Generando..." : "Exportar PDF"}
        </Button>
      </div>

      {downloadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {downloadError}
        </div>
      )}

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
            <CurvaSChart semanas={timeline.semanas} semanaActual={timeline.semanaActual} />
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
