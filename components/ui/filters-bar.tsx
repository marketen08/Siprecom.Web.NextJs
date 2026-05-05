"use client"

import * as React from "react"
import { Filter, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export interface FilterChip {
  id: string
  /** Texto del chip, ej. "Sistema: SIS-01 — Tableros". */
  label: string
  /** Quitar este filtro (la página resetea el state al "all" / vacío). */
  onRemove: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes componibles. La página maneja el state `open` y arma el layout.
// ─────────────────────────────────────────────────────────────────────────────

/** Botón que abre el Sheet. Tiene badge con la cantidad de filtros activos. */
export function FiltersTrigger({
  open,
  onOpenChange,
  activeCount,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeCount: number
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={"gap-2 " + (className ?? "")}
      onClick={() => onOpenChange(!open)}
    >
      <Filter className="h-4 w-4" />
      Filtros
      {activeCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-medium px-1.5">
          {activeCount}
        </span>
      )}
    </Button>
  )
}

/** Pills de filtros activos + botón "Limpiar todo". Solo se renderiza si hay alguno. */
export function FiltersChips({
  activeFilters,
  onClearAll,
}: {
  activeFilters: FilterChip[]
  onClearAll: () => void
}) {
  if (activeFilters.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {activeFilters.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs text-blue-700 max-w-72"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="rounded-full hover:bg-blue-100 p-0.5 -mr-1 shrink-0"
            aria-label={`Quitar filtro ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
      >
        Limpiar todo
      </button>
    </div>
  )
}

/** Sheet con los controles de filtro. Children son los `<FilterField>` con sus selects/inputs. */
export function FiltersSheet({
  open,
  onOpenChange,
  onClearAll,
  hasActiveFilters,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClearAll: () => void
  hasActiveFilters: boolean
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription className="text-xs">
            Los cambios se aplican al instante.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6 space-y-4">
          {children}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              className="w-full mt-4"
              onClick={onClearAll}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar todos los filtros
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Wrapper para un control de filtro dentro del Sheet:
 * label arriba + el control (Select / Combobox / etc.) abajo.
 */
export function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
