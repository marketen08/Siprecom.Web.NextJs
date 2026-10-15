"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Palette } from "lucide-react"

import { MODO_COLOR, type ModoColor } from "../types"

const OPCIONES: Array<{ valor: ModoColor; label: string; ayuda: string }> = [
  { valor: MODO_COLOR.ninguno, label: "Sin color", ayuda: "Colores originales del modelo" },
  { valor: MODO_COLOR.estado, label: "Estado de avance", ayuda: "No iniciado / en curso / completado" },
  { valor: MODO_COLOR.pendientes, label: "Pendientes", ayuda: "Por categoría del punch (A/B/C/D)" },
  { valor: MODO_COLOR.testgroup, label: "Paquete de prueba", ayuda: "Un color por pack" },
]

interface Props {
  valor: ModoColor
  onChange: (v: ModoColor) => void
  /** Estilo compacto para la barra del visor fullscreen. */
  compacto?: boolean
  disabled?: boolean
}

/**
 * Selector del modo de coloreado. Los modos son excluyentes por naturaleza —
 * antes eran botones independientes que había que apagar entre sí a mano, y
 * agregar uno nuevo empeoraba el problema. Con un selector la exclusividad es
 * estructural y sumar modos es una línea.
 */
export function SelectorModoColor({ valor, onChange, compacto, disabled }: Props) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar al clickear afuera o con Escape.
  useEffect(() => {
    if (!abierto) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [abierto])

  const actual = OPCIONES.find((o) => o.valor === valor) ?? OPCIONES[0]
  const activo = valor !== MODO_COLOR.ninguno

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 ${
          compacto ? "py-1" : "py-1.5"
        } text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          activo
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : "text-gray-600 bg-white border-input hover:bg-gray-50"
        }`}
        title={`Colorear por: ${actual.label}`}
      >
        <Palette className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{activo ? actual.label : "Colorear"}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {abierto && (
        <div className="absolute right-0 z-30 mt-1 w-60 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
          {OPCIONES.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => { onChange(o.valor); setAbierto(false) }}
              className={`flex w-full cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-gray-50 ${
                o.valor === valor ? "bg-emerald-50/60" : ""
              }`}
            >
              <Check
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                  o.valor === valor ? "text-emerald-600" : "text-transparent"
                }`}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-gray-800">{o.label}</span>
                <span className="block text-[11px] text-muted-foreground">{o.ayuda}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
