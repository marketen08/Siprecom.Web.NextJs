"use client"

import * as React from "react"
import { ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

/**
 * Combobox simple con búsqueda. No depende de librerías externas — usa primitives
 * de React para el toggle, búsqueda client-side y click-outside.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  // Índice de la opción resaltada para navegación con teclado (flechas + Enter).
  const [highlighted, setHighlighted] = React.useState(0)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  // ID estable por instancia para el atributo `name` del input de búsqueda —
  // evita que el navegador matchee por nombre y aplique autofill (email/name).
  const searchName = React.useId()

  // Click-outside para cerrar
  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Resetear búsqueda al cerrar
  React.useEffect(() => {
    if (!open) setSearch("")
  }, [open])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  const selected = options.find((o) => o.value === value)

  // Al abrir o cambiar el filtro, resaltar la primera opción.
  React.useEffect(() => {
    setHighlighted(0)
  }, [search, open])

  // Mantener visible la opción resaltada al navegar con flechas.
  React.useEffect(() => {
    if (!open) return
    const node = listRef.current?.children[highlighted] as HTMLElement | undefined
    node?.scrollIntoView({ block: "nearest" })
  }, [highlighted, open])

  function commit(option: ComboboxOption | undefined) {
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      // Selecciona la opción resaltada (por default la primera de la lista).
      commit(filtered[highlighted] ?? filtered[0])
    }
  }

  return (
    // `min-w-0` + `w-full` fuerzan al wrapper a colapsar al ancho del padre
    // aunque sus hijos (labels de opciones largas) tengan contenido intrínseco
    // más grande. Sin esto, en un flex/grid parent, el wrapper se ensancha con
    // el contenido y empuja el layout hacia la derecha del viewport.
    <div ref={wrapperRef} className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && (
        // Popup: `w-full` copia el ancho del wrapper (que ya está clamped al
        // parent con min-w-0). `overflow-hidden` en el panel + wrap-break-word
        // en los items garantiza que ningún contenido interno pueda empujar
        // el ancho del panel hacia afuera del viewport.
        <div className="absolute z-50 left-0 top-full mt-1 w-full max-w-[calc(100vw-1rem)] rounded-md bg-popover shadow-md ring-1 ring-foreground/10 max-h-72 flex flex-col overflow-hidden">
          <div className="p-1.5 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-sm border border-input pl-7 pr-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={handleKeyDown}
                // Bloquear el autofill del navegador: "off" a secas Chrome/Firefox lo
                // ignoran; con name aleatorio + "new-password" + role=combobox el heurístico
                // de autofill deja de matchear. Sin esto, el input de búsqueda pisca con
                // valores del perfil del usuario (nombre, email) — molesto en el combobox
                // de Empresa del detalle de usuario.
                name={`combobox-search-${searchName}`}
                autoComplete="new-password"
                role="combobox"
                aria-autocomplete="list"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
              />
            </div>
          </div>
          <div ref={listRef} className="overflow-y-auto p-1 flex flex-col">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">{emptyMessage}</p>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => commit(o)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={cn(
                    // `whitespace-normal break-words` permite que labels largos
                    // (ej "TAG-1234 — Nombre muy largo del elemento") wrappean
                    // a varias líneas en vez de forzar overflow horizontal.
                    // `min-w-0` refuerza el shrink del contenido dentro del
                    // botón flexbox — sin él, en algunos browsers el texto
                    // "empuja" al contenedor y desborda.
                    "w-full text-left rounded-sm px-2 py-1.5 text-sm whitespace-normal wrap-break-word min-w-0",
                    i === highlighted && "bg-accent text-accent-foreground",
                    value === o.value && "font-medium"
                  )}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
