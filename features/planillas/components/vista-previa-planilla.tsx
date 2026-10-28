"use client"

import { ExternalLink, Loader2, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react"
import { useState } from "react"

import { useVistaPreviaPlanilla } from "../api/use-vista-previa-planilla"
import { Button } from "@/components/ui/button"

const ZOOMS = [50, 75, 100, 125, 150, 200]

interface Props {
  planillaId: string
  /** Huella del diseño (`useVersionDiseno`): al cambiar, se regenera. */
  version: string
  /** Si viene, muestra la X para cerrar el panel. */
  onClose?: () => void
  /** Oculta el botón "Otra ventana" (cuando ya estamos en ella). */
  enVentanaAparte?: boolean
}

/**
 * Vista previa del PDF en blanco dentro del diseñador. Muestra el PDF REAL que
 * genera el backend, como una imagen por página: así no salta a la página 1 ni
 * parpadea al regenerarse después de cada cambio, como pasaría con el visor de PDF
 * del navegador.
 */
export function VistaPreviaPlanilla({ planillaId, version, onClose, enVentanaAparte }: Props) {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useVistaPreviaPlanilla(planillaId, version, true)
  const [zoomIdx, setZoomIdx] = useState(2)
  const zoom = ZOOMS[zoomIdx]
  const paginas = data?.paginas ?? []

  function abrirVentana() {
    window.open(
      `/configuracion/planillas/${planillaId}/vista-previa`,
      `vista-previa-${planillaId}`,
      "popup,width=900,height=1000",
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-700">Vista previa</h3>
        {isFetching ? (
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Actualizando…
          </span>
        ) : paginas.length > 0 ? (
          <span className="ml-1 text-xs text-muted-foreground">
            {paginas.length} {paginas.length === 1 ? "página" : "páginas"}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="Alejar" disabled={zoomIdx === 0}
            onClick={() => setZoomIdx((i) => i - 1)}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{zoom}%</span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="Acercar" disabled={zoomIdx === ZOOMS.length - 1}
            onClick={() => setZoomIdx((i) => i + 1)}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="Regenerar ahora" disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {!enVentanaAparte && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              title="Abrir en otra ventana (se actualiza sola)"
              onClick={abrirVentana}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              title="Cerrar vista previa" onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 p-3">
        {isError && (
          <p className="mb-3 whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {(error as Error)?.message ?? "No se pudo generar la vista previa."}
          </p>
        )}
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generando PDF…
          </div>
        ) : (
          <div
            className={`mx-auto space-y-3 transition-opacity ${isFetching ? "opacity-60" : ""}`}
            style={{ width: `${zoom}%` }}
          >
            {paginas.map((png, i) => (
              <figure key={i} className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI generado por el backend, next/image no aporta nada */}
                <img
                  src={`data:image/png;base64,${png}`}
                  alt={`Página ${i + 1}`}
                  className="w-full border bg-white shadow-sm"
                  draggable={false}
                />
                {paginas.length > 1 && (
                  <figcaption className="text-center text-[11px] text-muted-foreground">
                    Página {i + 1} de {paginas.length}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
