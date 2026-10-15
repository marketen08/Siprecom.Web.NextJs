"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
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
 * Combobox con búsqueda. Montado sobre Radix Popover — el dropdown va por
 * portal a `document.body`, así que NO lo clippea ningún `overflow-hidden` de
 * ancestros (Card, Sheet, Dialog). Radix se encarga del posicionamiento
 * (flip cuando falta espacio abajo, shift cuando toca borde de viewport) y
 * del click-outside / escape.
 *
 * API pública preservada del Combobox previo — todos los call sites siguen
 * funcionando sin cambios.
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
  const listRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  // ID estable por instancia para el atributo `name` del input de búsqueda —
  // evita que el navegador matchee por nombre y aplique autofill (email/name).
  const searchName = React.useId()

  // Ancho medido del trigger — Radix expone `--radix-popover-trigger-width`
  // como CSS var en el content, la usamos para que el panel copie el ancho.

  // Reset búsqueda al cerrar.
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
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        {/*
          Portal a `document.body`: no lo clippan overflow-hidden ancestros.
          `--radix-popover-trigger-width` copia el ancho del trigger.
          `collisionPadding` deja un margen para que no toque el borde del viewport.
          `align="start"` alinea el borde izquierdo con el trigger.
          `onOpenAutoFocus` prevenido para enfocar el input de búsqueda propio.
        */}
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
          }}
          className={cn(
            "z-50 rounded-md bg-popover shadow-md ring-1 ring-foreground/10 max-h-72 flex flex-col overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
          )}
          style={{
            width: "var(--radix-popover-trigger-width)",
            maxWidth: "calc(100vw - 1rem)",
          }}
        >
          <div className="p-1.5 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
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
                    value === o.value && "font-medium",
                  )}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
