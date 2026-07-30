"use client"

import { useMemo, useState } from "react"
import { CircleAlert, Loader2, RefreshCw } from "lucide-react"

import {
  useGenerarSeleccionadas,
  useGetFaltantes,
  type ElementoTareaFaltante,
} from "@/features/tareas/api/use-elementostareas-faltantes"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetTareasSelect } from "@/features/tareas/api/use-get-tareas-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { DataTableWrapper } from "@/components/data-table-wrapper"
import {
  FiltersChips, FiltersSheet, FiltersTrigger, FilterField, type FilterChip,
} from "@/components/ui/filters-bar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

/** Clave de un par (elementoId, tareaId) para el set de seleccionados. */
const rowKey = (row: ElementoTareaFaltante) => `${row.elementoId}|${row.tareaId}`

/**
 * Vista de ETs "faltantes" (a generar) — combinaciones Elemento × Tarea que
 * deberían tener una fila activa según el catálogo pero no la tienen. Filtros
 * dentro de sheet lateral + toolbar contextual + cards en mobile — mismo
 * patrón que TareasExistentesTab.
 */
export function TareasFaltantesTab() {
  const [sistemaId, setSistemaId] = useState<string>(ALL)
  const [subSistemaId, setSubSistemaId] = useState<string>(ALL)
  const [elementoTipoId, setElementoTipoId] = useState<string>(ALL)
  const [tareaId, setTareaId] = useState<string>(ALL)
  const [nivelId, setNivelId] = useState<string>(ALL)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastResult, setLastResult] = useState<{
    creadas: number
    yaExistian: number
    invalidas: number
    solicitadasTotal: number
  } | null>(null)

  const { data: misProyectos } = useGetMisProyectos()
  const proyectoActivo = misProyectos?.find((p) => p.esActivo)
  const generacionManualActiva = proyectoActivo?.generacionTareasManual === true

  const { data, isLoading, isFetching } = useGetFaltantes({
    sistemaId: sistemaId === ALL ? undefined : sistemaId,
    subSistemaId: subSistemaId === ALL ? undefined : subSistemaId,
    elementoTipoId: elementoTipoId === ALL ? undefined : elementoTipoId,
    tareaId: tareaId === ALL ? undefined : tareaId,
  })
  const rowsBackend: ElementoTareaFaltante[] = data?.data ?? []
  const rows = useMemo<ElementoTareaFaltante[]>(
    () => (nivelId === ALL ? rowsBackend : rowsBackend.filter((r) => r.tareaNivelId === nivelId)),
    [rowsBackend, nivelId],
  )

  const generar = useGenerarSeleccionadas()

  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subsistemasRaw } = useGetSubSistemasSelect()
  const { data: tiposRaw } = useGetElementosTiposSelect()
  const { data: tareasRaw } = useGetTareasSelect()
  const { data: nivelesRaw } = useGetNivelesSelect()

  const sistemaOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const s of (sistemasRaw as any)?.data ?? []) {
      opts.push({ value: s.id, label: s.codigo ? `${s.codigo} — ${s.nombre}` : s.nombre })
    }
    return opts
  }, [sistemasRaw])

  const subsistemaOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const s of (subsistemasRaw as any)?.data ?? []) {
      if (sistemaId !== ALL && s.sistemaId !== sistemaId) continue
      opts.push({ value: s.id, label: s.codigo ? `${s.codigo} — ${s.nombre}` : s.nombre })
    }
    return opts
  }, [subsistemasRaw, sistemaId])

  const tipoOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const t of (tiposRaw as any)?.data ?? []) {
      opts.push({ value: t.id, label: t.nombre })
    }
    return opts
  }, [tiposRaw])

  const tareaOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todas" }]
    for (const t of (tareasRaw as any)?.data ?? []) {
      opts.push({ value: t.id, label: t.codigo ? `${t.codigo} — ${t.nombre}` : t.nombre })
    }
    return opts
  }, [tareasRaw])

  const nivelOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const n of nivelesRaw?.data ?? []) {
      opts.push({ value: n.id, label: n.nombre })
    }
    return opts
  }, [nivelesRaw])

  // ── Chips de filtros activos ─────────────────────────────────────────
  const activeFilters: FilterChip[] = []
  const chip = (id: string, key: string, value: string, onRemove: () => void) =>
    activeFilters.push({ id, label: `${key}: ${value}`, onRemove })

  if (sistemaId !== ALL) {
    chip("sist", "Sistema", sistemaOptions.find((o) => o.value === sistemaId)?.label ?? sistemaId,
      () => { setSistemaId(ALL); setSubSistemaId(ALL); setSelected(new Set()) })
  }
  if (subSistemaId !== ALL) {
    chip("sub", "Subsistema", subsistemaOptions.find((o) => o.value === subSistemaId)?.label ?? subSistemaId,
      () => { setSubSistemaId(ALL); setSelected(new Set()) })
  }
  if (elementoTipoId !== ALL) {
    chip("tipo", "Tipo", tipoOptions.find((o) => o.value === elementoTipoId)?.label ?? elementoTipoId,
      () => { setElementoTipoId(ALL); setSelected(new Set()) })
  }
  if (tareaId !== ALL) {
    chip("tar", "Tarea", tareaOptions.find((o) => o.value === tareaId)?.label ?? tareaId,
      () => { setTareaId(ALL); setSelected(new Set()) })
  }
  if (nivelId !== ALL) {
    chip("niv", "Nivel", nivelOptions.find((o) => o.value === nivelId)?.label ?? nivelId,
      () => { setNivelId(ALL); setSelected(new Set()) })
  }

  const limpiarFiltros = () => {
    setSistemaId(ALL); setSubSistemaId(ALL); setElementoTipoId(ALL)
    setTareaId(ALL); setNivelId(ALL)
    setSelected(new Set())
  }

  // ── Selección ────────────────────────────────────────────────────────
  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === rows.length) return new Set()
      return new Set(rows.map(rowKey))
    })
  }

  const total = rows.length
  const selectionCount = selected.size
  const selectedRows = rows.filter((r) => selected.has(rowKey(r)))

  const generarSeleccionadas = async () => {
    const items = selectedRows.map((r) => ({ elementoId: r.elementoId, tareaId: r.tareaId }))
    const res: any = await generar.mutateAsync(items)
    const d = res?.data
    setLastResult({
      creadas: d?.creadas ?? 0,
      yaExistian: d?.yaExistian ?? 0,
      invalidas: d?.invalidas ?? 0,
      solicitadasTotal: d?.solicitadasTotal ?? items.length,
    })
    setSelected(new Set())
  }

  const generarTodas = async () => {
    const items = rows.map((r) => ({ elementoId: r.elementoId, tareaId: r.tareaId }))
    const res: any = await generar.mutateAsync(items)
    const d = res?.data
    setLastResult({
      creadas: d?.creadas ?? 0,
      yaExistian: d?.yaExistian ?? 0,
      invalidas: d?.invalidas ?? 0,
      solicitadasTotal: d?.solicitadasTotal ?? items.length,
    })
    setSelected(new Set())
  }

  return (
    <div className="space-y-3">
      {/* Header: descripción + botón "Filtros" */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-2">
        <p className="text-sm text-muted-foreground flex-1">
          Muestra las combinaciones <em>Elemento × Tarea</em> que deberían tener una
          fila activa pero no la tienen. Filtrá, seleccioná y confirmá para materializarlas.
          Sólo crea, nunca modifica ni borra.
        </p>
        <div className="lg:ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {total} par(es) faltante(s)
          </span>
          <FiltersTrigger
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilters.length}
          />
          <ConfirmActionDialog
            trigger={<><RefreshCw className="h-4 w-4" /> Generar todas ({total})</>}
            triggerClassName="inline-flex items-center gap-1 h-9 rounded-md bg-blue-900 hover:bg-blue-800 text-white px-3 text-sm font-medium cursor-pointer disabled:opacity-50"
            title="¿Generar todas las faltantes?"
            description={
              <>Se van a crear <strong>{total}</strong> fila(s) en{" "}
                <code>ElementosTareas</code> (todas las visibles con los filtros
                actuales). Idempotente.
              </>
            }
            confirmText="Generar todas"
            pendingText="Generando..."
            onConfirm={generarTodas}
          />
        </div>
      </div>

      <FiltersChips activeFilters={activeFilters} onClearAll={limpiarFiltros} />

      {/* Banner del modo activo (informativo) */}
      {generacionManualActiva ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <CircleAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>Generación manual activada.</strong> La propagación automática está desactivada
            para este proyecto: al crear o importar Elementos/Tareas <strong>no</strong> se generan
            filas automáticamente. Materializalas desde acá.
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <CircleAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>Generación automática activa.</strong> Esta pantalla sirve para{" "}
            <strong>reconciliar faltantes</strong> (imports viejos, cambios de tipo).
          </div>
        </div>
      )}

      {/* Toolbar contextual bulk — solo si hay selección */}
      {selectionCount > 0 && (
        <div className="sticky top-14 z-30 flex flex-col lg:flex-row lg:items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 shadow-sm">
          <span className="text-sm text-blue-900">
            <strong>{selectionCount}</strong> par(es) seleccionado(s)
          </span>
          <div className="lg:ml-auto flex flex-wrap gap-2">
            <ConfirmActionDialog
              trigger={<><RefreshCw className="h-3.5 w-3.5" /> Generar seleccionadas</>}
              triggerClassName="inline-flex items-center gap-1 h-8 rounded-md border border-input bg-white px-2 text-xs font-medium hover:bg-gray-50 cursor-pointer"
              title={`¿Generar ${selectionCount} ElementoTarea(s)?`}
              description={
                <>Se van a crear <strong>{selectionCount}</strong> fila(s) en{" "}
                  <code>ElementosTareas</code>. Idempotente: si alguna ya existe, se
                  cuenta como &quot;ya existía&quot; y no se duplica.
                </>
              }
              confirmText="Generar"
              pendingText="Generando..."
              onConfirm={generarSeleccionadas}
            />
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpiar</Button>
          </div>
        </div>
      )}

      {/* Banner de resultado */}
      {lastResult && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 flex items-center gap-3">
          <span>
            Resultado: <strong>{lastResult.creadas}</strong> creada(s)
            {lastResult.yaExistian > 0 && (<> · <strong>{lastResult.yaExistian}</strong> ya existía(n)</>)}
            {lastResult.invalidas > 0 && (<> · <strong>{lastResult.invalidas}</strong> inválida(s)</>)}
            <> de {lastResult.solicitadasTotal} solicitada(s).</>
          </span>
          <button
            type="button"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setLastResult(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cards (mobile + tablet, < 1024px) */}
      <div className="lg:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            No hay Tareas pendientes de propagar con los filtros actuales.
          </div>
        ) : (
          rows.map((row) => {
            const key = rowKey(row)
            const checked = selected.has(key)
            return (
              <div
                key={key}
                className={
                  "rounded-lg border bg-white p-3 space-y-1 " +
                  (checked ? "border-blue-300 bg-blue-50/40" : "")
                }
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRow(key)}
                    aria-label="Seleccionar par"
                    className="h-4 w-4 mt-1 rounded border-input shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-gray-500 truncate">{row.elementoTag}</p>
                    <p className="font-medium truncate">
                      <span className="font-mono text-muted-foreground mr-1">{row.tareaCodigo}</span>
                      {row.tareaNombre}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {row.subSistemaCodigo ?? "—"}
                      {row.elementoTipoNombre && <> · {row.elementoTipoNombre}</>}
                      {row.tareaNivelNombre && <> · {row.tareaNivelNombre}</>}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Tabla (solo desktop >= 1024px) */}
      <div className="hidden lg:block">
        <DataTableWrapper isFetching={isFetching && !isLoading}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={total > 0 && selectionCount === total}
                    ref={(el) => {
                      if (el) el.indeterminate = selectionCount > 0 && selectionCount < total
                    }}
                    onChange={toggleAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Subsistema</TableHead>
                <TableHead>Elemento (TAG)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead>Nivel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Cargando...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No hay Tareas pendientes de propagar con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const key = rowKey(row)
                  const checked = selected.has(key)
                  return (
                    <TableRow key={key} className={checked ? "bg-blue-50/50" : "hover:bg-gray-50"}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRow(key)}
                          aria-label="Seleccionar fila"
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.sistemaCodigo ? <span className="font-mono">{row.sistemaCodigo}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.subSistemaCodigo ? <span className="font-mono">{row.subSistemaCodigo}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{row.elementoTag}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.elementoTipoNombre ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-muted-foreground mr-1">{row.tareaCodigo}</span>
                        {row.tareaNombre}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.tareaNivelNombre ?? "—"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </DataTableWrapper>
      </div>

      {/* Sheet de filtros */}
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={limpiarFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Sistema">
          <Combobox
            options={sistemaOptions}
            value={sistemaId}
            onChange={(v) => {
              setSistemaId(v)
              // Cascada: al cambiar Sistema, limpiar Subsistema.
              setSubSistemaId(ALL)
              setSelected(new Set())
            }}
            placeholder="Todos" searchPlaceholder="Buscar sistema..."
          />
        </FilterField>
        <FilterField label="Subsistema">
          <Combobox
            options={subsistemaOptions}
            value={subSistemaId}
            onChange={(v) => { setSubSistemaId(v); setSelected(new Set()) }}
            placeholder="Todos" searchPlaceholder="Buscar subsistema..."
          />
        </FilterField>
        <FilterField label="Tipo de elemento">
          <Combobox
            options={tipoOptions}
            value={elementoTipoId}
            onChange={(v) => { setElementoTipoId(v); setSelected(new Set()) }}
            placeholder="Todos" searchPlaceholder="Buscar tipo..."
          />
        </FilterField>
        <FilterField label="Tarea">
          <Combobox
            options={tareaOptions}
            value={tareaId}
            onChange={(v) => { setTareaId(v); setSelected(new Set()) }}
            placeholder="Todas" searchPlaceholder="Buscar tarea..."
          />
        </FilterField>
        <FilterField label="Nivel">
          <Combobox
            options={nivelOptions}
            value={nivelId}
            onChange={(v) => { setNivelId(v); setSelected(new Set()) }}
            placeholder="Todos" searchPlaceholder="Buscar nivel..."
          />
        </FilterField>
      </FiltersSheet>
    </div>
  )
}
