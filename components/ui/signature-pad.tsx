"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"
import { Eraser } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SignaturePadHandle {
  /** Devuelve el dataURL PNG (Base64). Null si está vacío. */
  getDataUrl(): string | null
  /** Limpia el canvas. */
  clear(): void
  /** True si el usuario aún no dibujó nada. */
  isEmpty(): boolean
}

interface SignaturePadProps {
  className?: string
  /** Alto del canvas (px). El ancho se adapta al contenedor. */
  height?: number
  /** Callback opcional cada vez que cambia el contenido (útil para enable/disable de botones). */
  onChange?: (isEmpty: boolean) => void
}

/**
 * Pad de firma redimensionable. El canvas usa el ancho del contenedor padre.
 * Llamar getDataUrl() / clear() / isEmpty() vía ref.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ className, height = 160, onChange }, ref) {
    const sigRef = useRef<SignatureCanvas | null>(null)
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const [width, setWidth] = useState(400)

    useEffect(() => {
      if (!wrapperRef.current) return
      const el = wrapperRef.current
      const update = () => setWidth(el.clientWidth)
      update()
      const ro = new ResizeObserver(update)
      ro.observe(el)
      return () => ro.disconnect()
    }, [])

    useImperativeHandle(ref, () => ({
      getDataUrl: () => {
        if (!sigRef.current || sigRef.current.isEmpty()) return null
        return sigRef.current.getCanvas().toDataURL("image/png")
      },
      clear: () => sigRef.current?.clear(),
      isEmpty: () => sigRef.current?.isEmpty() ?? true,
    }))

    return (
      <div ref={wrapperRef} className={cn("relative w-full", className)}>
        <div className="rounded-md border bg-white">
          <SignatureCanvas
            ref={(r) => { sigRef.current = r }}
            penColor="black"
            canvasProps={{
              width,
              height,
              className: "block w-full",
            }}
            onEnd={() => onChange?.(sigRef.current?.isEmpty() ?? true)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 h-7 px-2 text-xs gap-1"
          onClick={() => {
            sigRef.current?.clear()
            onChange?.(true)
          }}
        >
          <Eraser className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      </div>
    )
  }
)
