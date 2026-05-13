"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"

import { useGetElementosPorSubsistema } from "@/features/estadisticas/api/use-get-elementos-por-subsistema"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import { CantidadElementosChart } from "@/features/estadisticas/components/cantidad-elementos-chart"
import { Button } from "@/components/ui/button"

export default function CuantitativoSubsistemasPage() {
  const { data, isLoading, error } = useGetElementosPorSubsistema()
  const items = data?.data ?? []
  const total = items.reduce((acc, x) => acc + x.cantidad, 0)

  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function exportarPdf() {
    if (downloading) return
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadPdf("/api/reportes/cuantitativo-subsistemas/pdf", "cuantitativo-subsistemas.pdf")
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
          <h1 className="text-2xl font-bold text-gray-900">Cuantitativo por subsistemas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cantidad de elementos activos por subsistema del proyecto activo.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!isLoading && !error && items.length > 0 && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="text-2xl font-bold tabular-nums text-gray-900">{total}</div>
            </div>
          )}
          <Button variant="outline" onClick={exportarPdf} disabled={downloading} className="gap-2">
            {downloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />}
            {downloading ? "Generando..." : "Exportar PDF"}
          </Button>
        </div>
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
          Error al cargar la cantidad de elementos por subsistema.
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <CantidadElementosChart data={items} />
        </div>
      )}
    </div>
  )
}
