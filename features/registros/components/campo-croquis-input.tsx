"use client"

import { useRef, useState } from "react"
import { Eraser, Pencil } from "lucide-react"

import { SignaturePad, type SignaturePadHandle } from "@/components/ui/signature-pad"
import { Button } from "@/components/ui/button"

interface CroquisInputProps {
  /** Data URL PNG del dibujo, o "" si todavía no hay. Se persiste en RegistroValor.ValorJson. */
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  /** Alto configurado en el campo (Campo.AltoMm). Se usa para aproximar el alto del canvas. */
  altoMm: number
}

// 1 mm ≈ 3.78 px a 96 dpi. Acotamos el resultado: un croquis de 200 mm daría ~750 px
// y obligaría a scrollear medio formulario, y uno de 5 mm no se podría dibujar.
const PX_POR_MM = 96 / 25.4
const ALTO_MIN_PX = 120
const ALTO_MAX_PX = 400

/**
 * Campo Croquis (CampoTipoDato 14): el operador dibuja y el PNG se guarda en el
 * registro. En el PDF sale el dibujo, o un recuadro vacío si nadie dibujó.
 *
 * El dibujo se persiste en cada trazo terminado (`onChange` del pad) en vez de
 * detrás de un botón "guardar": el resto del formulario ya funciona así — se
 * escribe y el valor queda en el estado — y un botón extra invita a olvidárselo
 * y perder el croquis al confirmar.
 */
export function CampoCroquisInput({ value, onChange, readOnly, altoMm }: CroquisInputProps) {
  const padRef = useRef<SignaturePadHandle | null>(null)
  // Al montar con un dibujo ya guardado mostramos la imagen, no el canvas: volver a
  // dibujar es una decisión explícita ("Rehacer") para no pisarlo sin querer.
  const [editando, setEditando] = useState(false)

  const altoPx = Math.round(
    Math.min(ALTO_MAX_PX, Math.max(ALTO_MIN_PX, altoMm * PX_POR_MM)),
  )

  const hayDibujo = !!value

  if (readOnly) {
    return hayDibujo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt="Croquis"
        className="max-w-full rounded-md border bg-white"
        style={{ maxHeight: altoPx }}
      />
    ) : (
      <div
        className="flex items-center justify-center rounded-md border border-dashed bg-gray-50 text-xs text-muted-foreground"
        style={{ height: altoPx }}
      >
        Sin croquis.
      </div>
    )
  }

  if (hayDibujo && !editando) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Croquis"
          className="max-w-full rounded-md border bg-white"
          style={{ maxHeight: altoPx }}
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditando(true)}>
            <Pencil className="h-3.5 w-3.5" /> Rehacer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => onChange("")}
          >
            <Eraser className="h-3.5 w-3.5" /> Borrar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <SignaturePad
        ref={padRef}
        height={altoPx}
        // El pad avisa al terminar cada trazo; ahí leemos el dataURL y lo subimos al
        // estado del formulario. getDataUrl() devuelve null si quedó vacío.
        onChange={() => onChange(padRef.current?.getDataUrl() ?? "")}
      />
      <p className="text-[11px] text-muted-foreground">
        Dibujá con el mouse o el dedo. Se guarda al confirmar el registro.
      </p>
    </div>
  )
}
