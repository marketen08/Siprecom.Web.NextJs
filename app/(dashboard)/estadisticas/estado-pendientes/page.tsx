"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"

import { useGetDistribucionPendientes } from "@/features/estadisticas/api/use-get-distribucion-pendientes"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import { DonutDistribucion } from "@/features/estadisticas/components/donut-distribucion"
import { Button } from "@/components/ui/button"

export default function EstadoPendientesPage() {
  const porEstado = useGetDistribucionPendientes("estado")
  const porEspecialidad = useGetDistribucionPendientes("especialidad")
  const porCategoria = useGetDistribucionPendientes("categoria")

  const hayError =
    porEstado.error || porEspecialidad.error || porCategoria.error

  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function exportarPdf() {
    if (downloading) return
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadPdf(
        "/api/reportes/estado-pendientes/pdf?soloAbiertos=true",
        "estado-pendientes.pdf",
      )
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
          <h1 className="text-2xl font-bold text-gray-900">Estado de pendientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Distribución de pendientes abiertos del proyecto activo (excluye cerrados y cancelados).
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

      {hayError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al cargar la distribución de pendientes.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutDistribucion
          titulo="Por estado"
          descripcion="Abierto · En proceso · Pendiente aprobación"
          data={porEstado.data?.data ?? []}
          loading={porEstado.isLoading}
        />
        <DonutDistribucion
          titulo="Por especialidad"
          descripcion="Disciplina afectada por el pendiente"
          data={porEspecialidad.data?.data ?? []}
          loading={porEspecialidad.isLoading}
        />
        <DonutDistribucion
          titulo="Por categoría"
          descripcion="Tipo de hallazgo según catálogo"
          data={porCategoria.data?.data ?? []}
          loading={porCategoria.isLoading}
        />
      </div>
    </div>
  )
}
