"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, ChevronRight, Filter, X } from "lucide-react"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetEspecialidadesUsadas } from "@/features/especialidades/api/use-especialidades"
import { useGetNivelesUsadosSelect } from "@/features/niveles/api/use-get-niveles-select"
import { EstadoVisualIds, filtroVacio, isFiltroVacio, type FiltroVisor } from "../types"

interface Props {
  filtro: FiltroVisor
  onChange: (f: FiltroVisor) => void
  /** Resultado del backend, para mostrar "X de Y visibles". */
  totalCoinciden: number | null
  totalEntidades: number | null
  loading?: boolean
  onClose: () => void
}

/**
 * Panel lateral con filtros visuales del visor 3D. Multi-select por dimensión
 * (Sistema / SubSistema / Especialidad). Cada cambio en los filtros dispara el
 * fetch al backend para resolver los GUIDs visibles → el viewer aplica ghost.
 */
export function FiltrosVisorPanel({
  filtro, onChange, totalCoinciden, totalEntidades, loading, onClose,
}: Props) {
  const { data: sistemasData } = useGetSistemasSelect()
  const { data: subsistemasData } = useGetSubSistemasSelect()
  // Solo las Especialidades usadas por el proyecto activo — evita ofrecer
  // opciones en el filtro que dejarían 0 elementos al seleccionarlas.
  const { data: especialidadesData } = useGetEspecialidadesUsadas()
  // Solo los Niveles que el proyecto activo atraviesa — evita ofrecer en el
  // filtro un nivel sin tareas (lo cual dejaría 0 elementos al seleccionarlo).
  const { data: nivelesRaw } = useGetNivelesUsadosSelect()

  // Ordenado por código (numérico natural: S1, S2, … S10), no alfabético por nombre.
  const sistemas = [...(sistemasData?.data ?? [])].sort((a, b) =>
    (a.codigo ?? "").localeCompare(b.codigo ?? "", undefined, { numeric: true, sensitivity: "base" }))
  const todosSubsistemas = subsistemasData?.data ?? []
  const especialidades = especialidadesData?.data ?? []
  // El endpoint /api/niveles devuelve el array directo (no envuelto en {data}).
  // Lo soportamos por compat por si alguna versión lo envuelve.
  const niveles: Array<{ id: string; nombre: string; posicion?: number }> =
    (Array.isArray(nivelesRaw)
      ? nivelesRaw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (nivelesRaw as any)?.data ?? []) as Array<{ id: string; nombre: string; posicion?: number }>
  const nivelesOrdenados = [...niveles].sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0))

  // Si hay sistemas seleccionados, mostramos solo los subsistemas que les pertenecen.
  // Ordenados por código (numérico natural: SS1, SS2, … SS10), no alfabético por nombre.
  const subsistemasVisibles = useMemo(() => {
    const base = filtro.sistemaIds.length === 0
      ? todosSubsistemas
      : todosSubsistemas.filter((s) => new Set(filtro.sistemaIds).has(s.sistemaId))
    return [...base].sort((a, b) =>
      (a.codigo ?? "").localeCompare(b.codigo ?? "", undefined, { numeric: true, sensitivity: "base" }))
  }, [todosSubsistemas, filtro.sistemaIds])

  const vacio = isFiltroVacio(filtro)

  function toggleSet(
    list: string[],
    id: string,
    apply: (next: string[]) => Partial<FiltroVisor>,
  ) {
    const set = new Set(list)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange({ ...filtro, ...apply(Array.from(set)) })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col h-full max-h-full overflow-hidden w-full md:w-72 md:shrink-0">
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <Filter className="h-4 w-4 text-blue-600" />
          Filtros
          {!vacio && totalCoinciden !== null && totalEntidades !== null && (
            <span className="text-xs font-medium text-gray-500 ml-1">
              · {totalCoinciden.toLocaleString("es-AR")} / {totalEntidades.toLocaleString("es-AR")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!vacio && (
            <button
              type="button"
              onClick={() => onChange(filtroVacio())}
              disabled={loading}
              className="cursor-pointer text-[11px] font-medium leading-none text-gray-600 border border-gray-200 rounded px-1.5 py-1 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
        <Seccion
          titulo="Niveles"
          selectedCount={filtro.nivelIds.length}
          defaultOpen
        >
          <ChecklistMulti
            items={nivelesOrdenados.map((n) => ({ id: n.id, label: n.nombre }))}
            selectedIds={filtro.nivelIds}
            onToggle={(id) => toggleSet(filtro.nivelIds, id, (next) => ({ nivelIds: next }))}
            empty="No hay niveles definidos."
          />
        </Seccion>

        <Seccion
          titulo="Sistemas"
          selectedCount={filtro.sistemaIds.length}
          defaultOpen
        >
          <ChecklistMulti
            items={sistemas.map((s) => ({ id: s.id, label: `${s.codigo} · ${s.nombre}` }))}
            selectedIds={filtro.sistemaIds}
            onToggle={(id) => toggleSet(filtro.sistemaIds, id, (next) => ({
              sistemaIds: next,
              // si cambian los sistemas, depurar subsistemas que ya no aplican
              subSistemaIds: next.length === 0
                ? filtro.subSistemaIds
                : filtro.subSistemaIds.filter((ssId) =>
                    todosSubsistemas.find((ss) => ss.id === ssId && next.includes(ss.sistemaId))),
            }))}
          />
        </Seccion>

        <Seccion
          titulo="SubSistemas"
          selectedCount={filtro.subSistemaIds.length}
        >
          <ChecklistMulti
            items={subsistemasVisibles.map((s) => ({
              id: s.id,
              label: `${s.codigo} · ${s.nombre}`,
            }))}
            selectedIds={filtro.subSistemaIds}
            onToggle={(id) => toggleSet(filtro.subSistemaIds, id, (next) => ({ subSistemaIds: next }))}
            empty="No hay subsistemas para los sistemas seleccionados."
          />
        </Seccion>

        <Seccion
          titulo="Especialidades"
          selectedCount={filtro.especialidadIds.length}
        >
          <ChecklistMulti
            items={especialidades.map((e) => ({
              id: e.id,
              label: e.codigo ? `${e.codigo} · ${e.nombre}` : e.nombre,
            }))}
            selectedIds={filtro.especialidadIds}
            onToggle={(id) => toggleSet(filtro.especialidadIds, id, (next) => ({ especialidadIds: next }))}
          />
        </Seccion>

        <Seccion
          titulo="Estado del Elemento"
          selectedCount={filtro.estadosVisuales.length}
        >
          <ChecklistMultiNum
            items={ESTADO_OPTIONS}
            selectedIds={filtro.estadosVisuales}
            onToggle={(id) => {
              const set = new Set(filtro.estadosVisuales)
              if (set.has(id)) set.delete(id)
              else set.add(id)
              onChange({ ...filtro, estadosVisuales: Array.from(set) })
            }}
          />
        </Seccion>

        <Seccion titulo="Entidades sin vincular" defaultOpen>
          <RadioNoVinculadas
            modo={resolverModoNoVinculadas(filtro)}
            onChange={(modo) => onChange({
              ...filtro,
              ocultarNoVinculadas: modo === "ocultar",
            })}
          />
        </Seccion>
      </div>
    </div>
  )
}

// Opciones de filtro por estado — color + label coherentes con la leyenda.
// Sin "Rechazado": cuando un Elemento no aplica se elimina, no se rechazan sus
// tareas, así que no se ofrece como estado para filtrar/atenuar.
const ESTADO_OPTIONS: { id: number; label: string; color: string }[] = [
  { id: EstadoVisualIds.Completado, label: "Completado",  color: "#10b981" },
  { id: EstadoVisualIds.EnCurso,    label: "En curso",    color: "#f59e0b" },
  { id: EstadoVisualIds.NoIniciado, label: "No iniciado", color: "#94a3b8" },
]

// ─── Sección colapsable ────────────────────────────────────────────────────

function Seccion({
  titulo, selectedCount, defaultOpen, children,
}: {
  titulo: string
  selectedCount?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-800"
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {titulo}
        </span>
        {selectedCount !== undefined && selectedCount > 0 && (
          <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold">
            {selectedCount}
          </span>
        )}
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  )
}

// ─── Checklist multi-select ────────────────────────────────────────────────

function ChecklistMultiNum({
  items, selectedIds, onToggle,
}: {
  items: { id: number; label: string; color: string }[]
  selectedIds: number[]
  onToggle: (id: number) => void
}) {
  const selectedSet = new Set(selectedIds)
  return (
    <ul className="-mx-1 space-y-0.5">
      {items.map((it) => {
        const checked = selectedSet.has(it.id)
        return (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => onToggle(it.id)}
              className={`w-full text-left flex items-center gap-2 px-1.5 py-1 rounded text-xs transition-colors ${
                checked ? "bg-blue-50 text-blue-800" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className={`flex items-center justify-center h-4 w-4 rounded border ${
                checked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
              }`}>
                {checked && <Check className="h-3 w-3" />}
              </span>
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm border border-black/10"
                style={{ backgroundColor: it.color }}
              />
              <span>{it.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Radio "Entidades sin vincular" ────────────────────────────────────────
// Sólo 2 modos: atenuar (default) u ocultar.

type ModoNoVinculadas = "atenuar" | "ocultar"

function resolverModoNoVinculadas(f: FiltroVisor): ModoNoVinculadas {
  return f.ocultarNoVinculadas ? "ocultar" : "atenuar"
}

const OPCIONES_NO_VINCULADAS: { id: ModoNoVinculadas; label: string; hint: string }[] = [
  { id: "atenuar", label: "Atenuar", hint: "Default — semi-transparentes" },
  { id: "ocultar", label: "Ocultar", hint: "Invisibles totalmente" },
]

function RadioNoVinculadas({
  modo, onChange,
}: {
  modo: ModoNoVinculadas
  onChange: (m: ModoNoVinculadas) => void
}) {
  return (
    <ul className="-mx-1 space-y-0.5">
      {OPCIONES_NO_VINCULADAS.map((opt) => {
        const checked = modo === opt.id
        return (
          <li key={opt.id}>
            <button
              type="button"
              onClick={() => onChange(opt.id)}
              className={`w-full text-left flex items-center gap-2 px-1.5 py-1 rounded text-xs transition-colors ${
                checked ? "bg-blue-50 text-blue-800" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className={`flex items-center justify-center h-4 w-4 rounded-full border ${
                checked ? "border-blue-600" : "border-gray-300"
              }`}>
                {checked && <span className="h-2 w-2 rounded-full bg-blue-600" />}
              </span>
              <span className="flex flex-col">
                <span className="font-medium">{opt.label}</span>
                <span className="text-[10px] text-gray-500">{opt.hint}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function ChecklistMulti({
  items, selectedIds, onToggle, empty = "Sin opciones.",
}: {
  items: { id: string; label: string }[]
  selectedIds: string[]
  onToggle: (id: string) => void
  empty?: string
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-1">{empty}</p>
  }
  const selectedSet = new Set(selectedIds)
  return (
    <ul className="max-h-48 overflow-y-auto -mx-1 space-y-0.5">
      {items.map((it) => {
        const checked = selectedSet.has(it.id)
        return (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => onToggle(it.id)}
              className={`w-full text-left flex items-center gap-2 px-1.5 py-1 rounded text-xs transition-colors ${
                checked
                  ? "bg-blue-50 text-blue-800"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className={`flex items-center justify-center h-4 w-4 rounded border ${
                checked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
              }`}>
                {checked && <Check className="h-3 w-3" />}
              </span>
              <span className="truncate" title={it.label}>{it.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
