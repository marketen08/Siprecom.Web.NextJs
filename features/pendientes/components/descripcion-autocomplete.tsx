"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { Check } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { useDescripcionesSugeridas } from "../api/use-descripciones-catalogo"

interface DescripcionAutocompleteProps {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  name?: string
  disabled?: boolean
  placeholder?: string
  rows?: number
}

/**
 * Textarea + panel de sugerencias del catálogo de descripciones del proyecto.
 *
 * Los operadores tienden a escribir la misma cosa con variantes ("Falta
 * mantenimiento **de** tapa" vs "**en** tapa"). Este componente:
 *   1. Sugiere descripciones ya usadas mientras el user escribe.
 *   2. Un click en la sugerencia reemplaza el texto (garantiza copia exacta).
 *   3. Navegación con teclado: ↓/↑ mueve el highlight, Enter selecciona,
 *      Escape cierra.
 *
 * Al crear el pendiente, el backend registra automáticamente el uso en el
 * catálogo — no hace falta una acción explícita del user.
 */
export function DescripcionAutocomplete({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  placeholder,
  rows = 4,
}: DescripcionAutocompleteProps) {
  const [focused, setFocused] = useState(false)
  // Índice de la sugerencia "activa" para navegación por teclado. -1 = ninguna.
  const [activeIndex, setActiveIndex] = useState(-1)
  // Debounce del texto tipeado para no disparar fetch en cada tecla.
  const [debouncedQuery, setDebouncedQuery] = useState(value)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(value.trim()), 250)
    return () => clearTimeout(t)
  }, [value])

  // Traemos sugerencias solo cuando el textarea está enfocado — evita hits al
  // backend cuando el form ya está listo y el user tocó otro campo.
  const { data } = useDescripcionesSugeridas(debouncedQuery, {
    enabled: focused,
    limit: 8,
  })
  const sugerencias = data?.data ?? []

  // Match exacto: ¿lo tipeado coincide (case-insensitive, trimmed) con alguna
  // sugerencia? Mostramos ✓ para dar feedback de "estás reusando una existente".
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ")
  const textoNorm = norm(value)
  const matchExacto = useMemo(
    () => textoNorm.length > 0 && sugerencias.some((s) => norm(s.texto) === textoNorm),
    [sugerencias, textoNorm],
  )

  // Cerramos el panel cuando el foco sale del wrapper (incluye textarea y clicks
  // sobre las sugerencias).
  useEffect(() => {
    if (!focused) return
    const onDown = (ev: PointerEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(ev.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [focused])

  // Reset del highlight cuando cambia la lista (nueva query) o se cierra el panel.
  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedQuery, focused])

  // Scroll de la sugerencia activa a la vista.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const li = listRef.current.children[activeIndex] as HTMLElement | undefined
    li?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const seleccionar = useCallback((texto: string) => {
    onChange(texto)
    setFocused(false)
    setActiveIndex(-1)
  }, [onChange])

  const onKeyDown = useCallback((ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Sin panel visible no interceptamos nada — Enter debe seguir metiendo newline
    // normal, ↓/↑ deben mover el cursor dentro del textarea.
    if (!focused || sugerencias.length === 0) return

    if (ev.key === "ArrowDown") {
      ev.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, sugerencias.length - 1))
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (ev.key === "Enter" && !ev.shiftKey && activeIndex >= 0) {
      // Enter con sugerencia highlighted → seleccionarla. Shift+Enter sigue
      // insertando newline (no lo interceptamos).
      ev.preventDefault()
      seleccionar(sugerencias[activeIndex].texto)
    } else if (ev.key === "Escape") {
      ev.preventDefault()
      setFocused(false)
      setActiveIndex(-1)
    }
  }, [focused, sugerencias, activeIndex, seleccionar])

  return (
    <div ref={wrapperRef} className="relative">
      <Textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder ?? "Describí el pendiente con detalle..."}
        rows={rows}
        // ARIA: anuncia la relación textarea → listbox para lectores de pantalla.
        role="combobox"
        aria-expanded={focused && sugerencias.length > 0}
        aria-autocomplete="list"
        aria-controls="descripcion-sugerencias"
        aria-activedescendant={activeIndex >= 0 ? `desc-sug-${sugerencias[activeIndex]?.id}` : undefined}
      />

      {/* Feedback verde cuando el texto matchea exacto una sugerencia — le
          confirma al operador que está reusando y va a agrupar bien.
          El hint azul de "se creará como nueva" quedó fuera: parpadeaba al
          tipear porque el debounce/refetch toggeaba isFetching, y aportaba
          poco (el usuario ya sabe si escribió algo distinto). */}
      {matchExacto && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700">
          <Check className="h-3 w-3" />
          Descripción existente — quedará agrupada con las anteriores.
        </p>
      )}

      {/* Panel de sugerencias — solo cuando hay foco y algo para mostrar. */}
      {focused && sugerencias.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-input bg-popover shadow-lg"
          // Prevenir que el pointerdown del panel apague el foco antes del click.
          onPointerDown={(e) => e.preventDefault()}
        >
          <div className="sticky top-0 border-b bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
            <span>Descripciones ya usadas en este proyecto</span>
            <span className="normal-case tracking-normal text-[10px] font-normal">↓↑ Enter</span>
          </div>
          <ul
            ref={listRef}
            id="descripcion-sugerencias"
            role="listbox"
            className="py-1"
          >
            {sugerencias.map((s, idx) => {
              const esMatch = norm(s.texto) === textoNorm
              const esActive = idx === activeIndex
              return (
                <li
                  key={s.id}
                  id={`desc-sug-${s.id}`}
                  role="option"
                  aria-selected={esActive}
                >
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm cursor-pointer flex items-start justify-between gap-2 ${
                      esActive ? "bg-accent" : esMatch ? "bg-emerald-50" : "hover:bg-accent"
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => seleccionar(s.texto)}
                  >
                    <span className="flex-1 whitespace-pre-wrap">{s.texto}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums pt-0.5">
                      {s.vecesUsada}×
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
