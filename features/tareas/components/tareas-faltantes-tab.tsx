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

import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { DataTableWrapper } from "@/components/data-table-wrapper"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

/** Clave de un par (elementoId, tareaId) para el set de seleccionados. */
const rowKey = (row: ElementoTareaFaltante) => `${row.elementoId}|${row.tareaId}`

/**
 * Vista de ETs "faltantes" (a generar) — combinaciones Elemento × Tarea que
 * deberían tener una fila activa según el catálogo pero no la tienen.
 * Antes vivía en /alcance/tareas/generacion; ahora es un tab dentro de
 * /coordinacion/tareas para agrupar las operaciones simétricas
 * (eliminar existentes ↔ generar faltantes).
 */
export function TareasFaltantesTab() {
  const [sistemaId, setSistemaId] = useState<string>(ALL)
  const [subSistemaId, setSubSistemaId] = useState<string>(ALL)
  const [elementoTipoId, setElementoTipoId] = useState<string>(ALL)
  const [tareaId, setTareaId] = useState<string>(ALL)
  const [nivelId, setNivelId] = useState<string>(ALL)
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
    const all: ComboboxOption[] = [{ value: ALL, label: "Todos los sistemas" }]
    for (const s of (sistemasRaw as any)?.data ?? []) {
      all.push({ value: s.id, label: s.codigo ? `${s.codigo} — ${s.nombre}` : s.nombre })
    }
    return all
  }, [sistemasRaw])

  const subsistemaOptions = useMemo<ComboboxOption[]>(() => {
    const all: ComboboxOption[] = [{ value: ALL, label: "Todos los subsistemas" }]
    for (const s of (subsistemasRaw as any)?.data ?? []) {
      if (sistemaId !== ALL && s.sistemaId !== sistemaId) continue
      all.push({ value: s.id, label: s.codigo ? `${s.codigo} — ${s.nombre}` : s.nombre })
    }
    return all
  }, [subsistemasRaw, sistemaId])

  const tipoOptions = useMemo<ComboboxOption[]>(() => {
    const all: ComboboxOption[] = [{ value: ALL, label: "Todos los tipos" }]
    for (const t of (tiposRaw as any)?.data ?? []) {
      all.push({ value: t.id, label: t.nombre })
    }
    return all
  }, [tiposRaw])

  const tareaOptions = useMemo<ComboboxOption[]>(() => {
    const all: ComboboxOption[] = [{ value: ALL, label: "Todas las tareas" }]
    for (const t of (tareasRaw as any)?.data ?? []) {
      all.push({ value: t.id, label: t.codigo ? `${t.codigo} — ${t.nombre}` : t.nombre })
    }
    return all
  }, [tareasRaw])

  const nivelOptions = useMemo<ComboboxOption[]>(() => {
    const all: ComboboxOption[] = [{ value: ALL, label: "Todos los niveles" }]
    for (const n of nivelesRaw?.data ?? []) {
      all.push({ value: n.id, label: n.nombre })
    }
    return all
  }, [nivelesRaw])

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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Muestra las combinaciones <em>Elemento × Tarea</em> que deberían tener una
        fila activa pero no la tienen. Filtrá, seleccioná y confirmá para
        materializarlas. Sólo crea, nunca modifica ni borra.
      </p>

      {generacionManualActiva ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <CircleAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>Generación manual activada.</strong> La propagación automática
            de <em>Tareas para los Elementos</em> está desactivada para este proyecto: al crear
            o importar Elementos/Tareas <strong>no</strong> se generan filas
            automáticamente. Materializalas desde acá.
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <CircleAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>Generación automática activa.</strong> Las ET nuevas se crean
            solas al importar/crear datos. Esta pantalla sirve para{" "}
            <strong>reconciliar faltantes</strong> (imports viejos, cambios de
            tipo). El flag <em>GENERACION_TAREAS_MANUAL</em> se controla en
            Configuración → Funcionalidades del proyecto.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div>
          <label className="text-xs text-muted-foreground">Sistema</label>
          <Combobox
            options={sistemaOptions}
            value={sistemaId}
            onChange={(v) => {
              setSistemaId(v)
              setSubSistemaId(ALL)
              setSelected(new Set())
            }}
            placeholder="Todos"
            searchPlaceholder="Buscar sistema..."
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Subsistema</label>
          <Combobox
            options={subsistemaOptions}
            value={subSistemaId}
            onChange={(v) => { setSubSistemaId(v); setSelected(new Set()) }}
            placeholder="Todos"
            searchPlaceholder="Buscar subsistema..."
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tipo de elemento</label>
          <Combobox
            options={tipoOptions}
            value={elementoTipoId}
            onChange={(v) => { setElementoTipoId(v); setSelected(new Set()) }}
            placeholder="Todos"
            searchPlaceholder="Buscar tipo..."
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tarea</label>
          <Combobox
            options={tareaOptions}
            value={tareaId}
            onChange={(v) => { setTareaId(v); setSelected(new Set()) }}
            placeholder="Todas"
            searchPlaceholder="Buscar tarea..."
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Nivel</label>
          <Combobox
            options={nivelOptions}
            value={nivelId}
            onChange={(v) => { setNivelId(v); setSelected(new Set()) }}
            placeholder="Todos"
            searchPlaceholder="Buscar nivel..."
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">
          {total} par(es) faltante(s) · {selected.size} seleccionado(s)
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ConfirmActionDialog
            trigger={<><RefreshCw className="h-4 w-4" />Generar seleccionadas</>}
            triggerClassName="inline-flex items-center gap-2 h-9 rounded-md border border-input bg-white px-3 text-sm font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-50"
            title={`¿Generar ${selected.size} ElementoTarea(s)?`}
            description={
              <>Se van a crear <strong>{selected.size}</strong> fila(s) en{" "}
                <code>ElementosTareas</code>. Idempotente: si alguna ya existe, se
                cuenta como &quot;ya existía&quot; y no se duplica.
              </>
            }
            confirmText="Generar"
            pendingText="Generando..."
            onConfirm={generarSeleccionadas}
          />
          <ConfirmActionDialog
            trigger={<><RefreshCw className="h-4 w-4" />Generar todas ({total})</>}
            triggerClassName="inline-flex items-center gap-2 h-9 rounded-md bg-blue-900 hover:bg-blue-800 text-white px-3 text-sm font-medium cursor-pointer disabled:opacity-50"
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

      {lastResult && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Resultado: <strong>{lastResult.creadas}</strong> creada(s)
          {lastResult.yaExistian > 0 && (<> · <strong>{lastResult.yaExistian}</strong> ya existía(n)</>)}
          {lastResult.invalidas > 0 && (<> · <strong>{lastResult.invalidas}</strong> inválida(s)</>)}
          <> de {lastResult.solicitadasTotal} solicitada(s).</>
        </div>
      )}

      <DataTableWrapper isFetching={isFetching && !isLoading}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={total > 0 && selected.size === total}
                  ref={(el) => {
                    if (el) el.indeterminate = selected.size > 0 && selected.size < total
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
  )
}
