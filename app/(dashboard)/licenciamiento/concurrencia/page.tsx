"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, BarChart3, Download } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ConcurrenciaMes {
  anio: number
  mes: number
  etiqueta: string
  picoConcurrencia: number
  diaPico: string
  excedente: number
}
interface ReporteConcurrencia {
  licenciasBase: number
  meses: ConcurrenciaMes[]
}

function fecha(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function ConcurrenciaPage() {
  const [descargando, setDescargando] = useState(false)
  const [errorPdf, setErrorPdf] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["licenciamiento", "concurrencia"],
    queryFn: () => apiClient.get<ReporteConcurrencia>("/api/licenciamiento/concurrencia"),
  })

  async function descargar() {
    setErrorPdf(null)
    setDescargando(true)
    try {
      await downloadPdf("/api/licenciamiento/concurrencia/pdf", "concurrencia.pdf")
    } catch (e) {
      setErrorPdf((e as Error).message)
    } finally {
      setDescargando(false)
    }
  }

  const base = data?.licenciasBase ?? 0

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="h-6 w-6 text-blue-700" /> Reporte de concurrencia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pico de usuarios concurrentes por mes vs el alcance base de licencias.
          </p>
        </div>
        <Button onClick={descargar} disabled={descargando || isLoading} className="gap-2 shrink-0">
          {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {descargando ? "Generando…" : "Descargar PDF"}
        </Button>
      </div>

      {errorPdf && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errorPdf}
        </div>
      )}

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        La facturación de usuarios adicionales se calcula sobre la concurrencia pico del mes. Si el
        pico no supera el alcance base (<strong>{base}</strong> licencias), no se factura cargo
        adicional por ese mes.
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">No se pudo cargar el reporte.</p>
        ) : !data || data.meses.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Todavía no hay datos de concurrencia registrados.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Mes</th>
                <th className="px-4 py-2 text-right font-semibold">Pico concurrencia</th>
                <th className="px-4 py-2 text-right font-semibold">Día del pico</th>
                <th className="px-4 py-2 text-right font-semibold">Licencias base</th>
                <th className="px-4 py-2 text-right font-semibold">Usuarios adicionales</th>
              </tr>
            </thead>
            <tbody>
              {data.meses.map((m) => (
                <tr key={`${m.anio}-${m.mes}`} className="border-t border-gray-100">
                  <td className="px-4 py-2">{m.etiqueta}</td>
                  <td className="px-4 py-2 text-right font-semibold">{m.picoConcurrencia}</td>
                  <td className="px-4 py-2 text-right text-gray-500 tabular-nums">{fecha(m.diaPico)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{data.licenciasBase}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${m.excedente > 0 ? "text-red-700" : "text-green-700"}`}>
                    {m.excedente}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
