"use client"

import { useEffect, useRef, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

// El helper de pdfjs vive en features/pids porque nació con el visor de planos,
// pero no tiene nada de PID: carga la librería una sola vez, le configura el
// worker y rasteriza una página a un canvas. Reusarlo es mejor que duplicar el
// setup del worker, que es justo la parte que se rompe con el bundler.
import { loadPdfjs, renderPage, isRenderCancelledError } from "@/features/pids/lib/pid-viewer-lib"
import { Button } from "@/components/ui/button"

/** Lo mínimo que usamos del PDFDocumentProxy de pdfjs. */
interface PdfDocLike {
  numPages: number
  destroy?: () => void
}

/**
 * El PDF del registro dibujado con pdfjs, para celular.
 *
 * Existe porque el `<iframe>` no sirve en un teléfono: Chrome de Android no
 * dibuja un PDF adentro de uno —ofrece descargarlo— y Safari de iOS muestra la
 * primera página sin scroll. Y es la vista que se abre sola cuando el registro
 * está cerrado, que es cuando hay que leerlo y firmarlo: mandar a la persona al
 * visor del sistema justo ahí la saca de la pantalla donde está la firma.
 *
 * Rasteriza cada página a un `<canvas>` al ancho del contenedor. El acercamiento
 * lo da el pinch del navegador, que sobre un canvas funciona igual que sobre
 * cualquier otra cosa; el techo de nitidez es el DPR (`renderPage` lo capea en
 * 2x), así que para leer una letra chica sigue estando el visor del teléfono en
 * el enlace del pie.
 *
 * Renderiza todas las páginas de una, en serie. El preview es el registro
 * unificado —sin los adjuntos pegados atrás—, o sea una planilla y, si hubo
 * firma electrónica, la hoja de certificado: dos o tres páginas. Si algún día
 * creciera, lo que hay que cambiar es esto por un render perezoso con
 * IntersectionObserver; el resto del componente no se entera.
 */
export function RegistroPdfMovil({ registroId }: { registroId: string }) {
  const url = `/api/registros/${registroId}/pdf/preview`

  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([])
  const renderRef = useRef<{ cancel: () => void } | null>(null)

  const [doc, setDoc] = useState<PdfDocLike | null>(null)
  const [paginaLista, setPaginaLista] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * Ancho del contenedor en px CSS. Mientras sea 0 el componente no hace nada,
   * y eso es a propósito: en escritorio vive adentro de un `md:hidden`, o sea
   * `display:none`, y sin esta guarda bajaría el PDF por segunda vez al lado
   * del que ya trae el iframe. También es lo que lo hace re-renderizar al girar
   * el teléfono.
   */
  const [ancho, setAncho] = useState(0)
  const activo = ancho > 0

  // Medir el contenedor. El ResizeObserver cubre el giro del teléfono y el
  // cruce del breakpoint en una ventana de escritorio que se agranda/achica.
  useEffect(() => {
    const el = contenedorRef.current
    if (!el) return
    const medir = () => setAncho(el.clientWidth)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Abrir el PDF. Lo trae pdfjs por su cuenta desde la ruta del preview: es
  // same-origin, así que la cookie de sesión viaja sola —la misma razón por la
  // que el iframe funciona— y además lo pide por rango en vez de entero.
  useEffect(() => {
    if (!activo) return
    let cancelado = false
    ;(async () => {
      try {
        const pdfjs = await loadPdfjs()
        const abierto: PdfDocLike = await pdfjs.getDocument({ url }).promise
        if (cancelado) {
          abierto.destroy?.()
          return
        }
        canvasRefs.current = Array(abierto.numPages).fill(null)
        setDoc(abierto)
      } catch (e) {
        if (!cancelado) setError((e as Error).message || "No se pudo abrir el PDF.")
      }
    })()
    return () => {
      cancelado = true
    }
    // Depende de `activo`, no de `ancho`: el cambio de ancho lo atiende el
    // render, que no vuelve a abrir el documento —abrirlo es la parte cara—.
  }, [url, activo])

  // Destruir el documento al desmontar. Va aparte del efecto que lo abre para
  // que un cambio de ancho no lo tire: abrirlo es la parte cara.
  useEffect(() => {
    return () => {
      renderRef.current?.cancel()
      doc?.destroy?.()
    }
  }, [doc])

  // Dibujar. Una página por vez: dos `render()` simultáneos sobre el mismo
  // documento compiten por el worker y el primer dibujo tarda más en aparecer,
  // que es el único que la persona está esperando.
  useEffect(() => {
    if (!doc || ancho === 0) return
    let cancelado = false
    ;(async () => {
      for (let n = 1; n <= doc.numPages; n++) {
        const canvas = canvasRefs.current[n - 1]
        if (cancelado) return
        if (!canvas) continue
        // `ancho - 2` por el borde del canvas: con `box-sizing: border-box` el
        // ancho que fija `renderPage` incluye el borde, y el dibujo quedaría
        // apretado 2px contra su propio bitmap.
        // `Infinity` de alto: acá se ajusta por ancho y la página mide lo que
        // mida; el largo lo resuelve el scroll de la pantalla.
        const handle = renderPage(doc, n, canvas, Math.max(ancho - 2, 1), Infinity)
        renderRef.current = handle
        try {
          await handle.promise
        } catch (e) {
          if (cancelado || isRenderCancelledError(e)) return
          setError((e as Error).message || "No se pudo dibujar el PDF.")
          return
        }
        if (!cancelado && n === 1) setPaginaLista(true)
      }
    })()
    return () => {
      cancelado = true
      renderRef.current?.cancel()
    }
  }, [doc, ancho])

  const abrirEnVisor = (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <Button variant="outline" size="sm" className="w-full gap-2">
        <ExternalLink className="h-3.5 w-3.5" />
        Abrir en el visor del teléfono
      </Button>
    </a>
  )

  // Si pdfjs no pudo con el archivo queda el visor del sistema, que es otro
  // motor: lo que acá falla allá puede abrir igual.
  if (error) {
    return (
      <div ref={contenedorRef} className="space-y-3 rounded-xl border bg-white p-5 text-center">
        <p className="text-sm font-medium text-gray-800">No se pudo mostrar el PDF acá</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        {abrirEnVisor}
      </div>
    )
  }

  return (
    <div ref={contenedorRef} className="space-y-3">
      {!paginaLista && (
        <div className="flex h-64 items-center justify-center gap-2 rounded-xl border bg-white text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Dibujando el registro...
        </div>
      )}
      {/* Los canvas se montan junto con el documento —antes de dibujarse— para
          que las refs existan cuando el render las busca. Sin alto propio no
          ocupan nada, así que no hay hueco debajo del cartel de carga. */}
      {doc && (
        <div className="space-y-3">
          {Array.from({ length: doc.numPages }, (_, i) => (
            <div key={i} className="space-y-1">
              <canvas
                ref={(el) => {
                  canvasRefs.current[i] = el
                }}
                className="block rounded-xl border bg-white"
              />
              {doc.numPages > 1 && paginaLista && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Página {i + 1} de {doc.numPages}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {paginaLista && abrirEnVisor}
    </div>
  )
}
