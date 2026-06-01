"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, Save, Search, Sparkles, X } from "lucide-react"

import {
  useGetElementoValoresPrecargadosUnificados,
  useUpsertElementoValoresPrecargadosUnificados,
} from "../api/use-elemento-valores-precargados"
import type {
  ElementoValorPrecargadoUnificado,
  ElementoValorPrecargadoUnificadoUpsertInput,
} from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  elementoId: string
  open: boolean
  onClose: () => void
}

interface RowValue {
  valorTexto: string | null
  valorNumero: number | null
  valorFecha: string | null
  valorBit: boolean | null
}

const EMPTY_ROW: RowValue = {
  valorTexto: null,
  valorNumero: null,
  valorFecha: null,
  valorBit: null,
}

function buildInitialState(
  campos: ElementoValorPrecargadoUnificado[],
): Record<string, RowValue> {
  const out: Record<string, RowValue> = {}
  for (const c of campos) {
    out[c.campoId] = {
      valorTexto: c.valorTexto,
      valorNumero: c.valorNumero,
      valorFecha: c.valorFecha ? c.valorFecha.substring(0, 10) : null,
      valorBit: c.valorBit,
    }
  }
  return out
}

function isRowEmpty(r: RowValue): boolean {
  return (
    (r.valorTexto === null || r.valorTexto === "") &&
    r.valorNumero === null &&
    (r.valorFecha === null || r.valorFecha === "") &&
    r.valorBit === null
  )
}

export function ElementoValoresPrecargadosDialog({ elementoId, open, onClose }: Props) {
  const { data, isLoading } = useGetElementoValoresPrecargadosUnificados(open ? elementoId : null)
  const upsert = useUpsertElementoValoresPrecargadosUnificados(elementoId)

  const campos = useMemo(() => data?.data ?? [], [data])
  const [rows, setRows] = useState<Record<string, RowValue>>({})
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  // Mount-guard para createPortal: evita hydration mismatch en SSR (document.body
  // no existe del lado server). Una vez montado en cliente, render normal.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Cuando los datos llegan o cambian, hidratamos el estado local. Al cerrar el
  // modal, limpiamos para evitar mostrar datos viejos al reabrirlo.
  useEffect(() => {
    if (!open) {
      setSearch("")
      setError(null)
      return
    }
    setRows(buildInitialState(campos))
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campos.length])

  const camposFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campos
    return campos.filter((c) =>
      (c.campoEtiqueta ?? "").toLowerCase().includes(q)
      || (c.campoCodigo ?? "").toLowerCase().includes(q),
    )
  }, [campos, search])

  function updateRow(campoId: string, patch: Partial<RowValue>) {
    setRows((prev) => ({
      ...prev,
      [campoId]: { ...EMPTY_ROW, ...prev[campoId], ...patch },
    }))
    if (error) setError(null)
  }

  async function handleGuardar() {
    setError(null)
    const items: ElementoValorPrecargadoUnificadoUpsertInput[] = Object.entries(rows)
      .filter(([, v]) => !isRowEmpty(v))
      .map(([campoId, v]) => ({
        campoId,
        valorTexto: v.valorTexto,
        valorNumero: v.valorNumero,
        valorFecha: v.valorFecha,
        valorBit: v.valorBit,
      }))

    try {
      await upsert.mutateAsync(items)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!open || !mounted) return null

  // Portal al document.body para escapar del stacking context del Sheet padre.
  // z-60 queda por encima del z-50 del Sheet/Overlay.
  return createPortal(
    // Overlay
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !upsert.isPending) onClose() }}
    >
      <div className="relative w-full max-w-3xl mx-4 h-[85vh] flex flex-col rounded-xl bg-white shadow-xl border border-gray-200">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Valores precargados</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Datos que vienen rellenados al iniciar el registro digital y se imprimen
                en la planilla PDF en blanco. Se aplican a todas las planillas del elemento.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5 shrink-0"
            aria-label="Cerrar"
            disabled={upsert.isPending}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Separator />

        {/* Buscador */}
        <div className="px-6 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Lista de campos (scroll interno) */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando campos...
            </div>
          ) : campos.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-8 text-center">
              Este elemento no tiene tareas con planilla asignada. Sin planillas, no hay
              campos para precargar.
            </p>
          ) : camposFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-8 text-center">
              No hay campos que coincidan con "{search}".
            </p>
          ) : (
            <div className="rounded-md border divide-y">
              {camposFiltrados.map((campo) => {
                const row = rows[campo.campoId] ?? EMPTY_ROW
                return (
                  <div
                    key={campo.campoId}
                    className="px-3 py-3 grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-5">
                      <p className="text-sm font-medium">{campo.campoEtiqueta}</p>
                      {campo.campoUnidad && (
                        <p className="text-xs text-muted-foreground">{campo.campoUnidad}</p>
                      )}
                      {campo.planillas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {campo.planillas.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700"
                              title={p.nombre}
                            >
                              {p.codigo || p.nombre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-7">
                      <CampoInput
                        campo={campo}
                        row={row}
                        onChange={(patch) => updateRow(campo.campoId, patch)}
                        disabled={upsert.isPending}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="px-6 pb-3">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <Separator />

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={upsert.isPending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGuardar}
            disabled={upsert.isPending || isLoading || campos.length === 0}
            className="gap-1.5"
          >
            {upsert.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Guardar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface CampoInputProps {
  campo: ElementoValorPrecargadoUnificado
  row: RowValue
  onChange: (patch: Partial<RowValue>) => void
  disabled?: boolean
}

function CampoInput({ campo, row, onChange, disabled }: CampoInputProps) {
  switch (campo.campoTipoDato) {
    case 2: // Número
      return (
        <Input
          type="number"
          step="any"
          value={row.valorNumero ?? ""}
          onChange={(e) => {
            const v = e.target.value
            onChange({ valorNumero: v === "" ? null : Number(v) })
          }}
          disabled={disabled}
          className="h-8"
        />
      )
    case 3: // Fecha
      return (
        <Input
          type="date"
          value={row.valorFecha ?? ""}
          onChange={(e) => onChange({ valorFecha: e.target.value || null })}
          disabled={disabled}
          className="h-8"
        />
      )
    case 4: // Boolean
      return (
        <Select
          value={row.valorBit === null ? "" : row.valorBit ? "true" : "false"}
          onValueChange={(v) =>
            onChange({ valorBit: v === "" ? null : v === "true" })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Sí</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      )
    case 5: { // Lista
      const opciones = [...campo.opciones].sort((a, b) => a.orden - b.orden)
      return (
        <Select
          value={row.valorTexto ?? ""}
          onValueChange={(v) => onChange({ valorTexto: v || null })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {opciones.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.etiqueta ?? o.valor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    default: // 1 = Texto
      return (
        <Input
          type="text"
          value={row.valorTexto ?? ""}
          onChange={(e) => onChange({ valorTexto: e.target.value || null })}
          disabled={disabled}
          className="h-8"
        />
      )
  }
}
