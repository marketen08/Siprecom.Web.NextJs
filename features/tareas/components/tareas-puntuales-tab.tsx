"use client"

import { useMemo, useState } from "react"
import { CircleAlert, Info, Loader2, Target } from "lucide-react"

import { useGenerarSeleccionadas } from "@/features/tareas/api/use-elementostareas-faltantes"
import { useGetTareas } from "@/features/tareas/api/use-get-tareas"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { DataTableWrapper } from "@/components/data-table-wrapper"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

// Tope de elementos que trae el listado. El endpoint cortaría en 1000 igual
// (PagedRequest.PageSize se clampea ahí), así que lo hacemos explícito y
// avisamos en pantalla cuando se llega al tope, en vez de mostrar una lista
// truncada que parece completa.
const MAX_ELEMENTOS = 1000

/**
 * Tab "Puntuales": asigna una tarea ad-hoc (`Tarea.EsAdHoc`) a elementos elegidos
 * a mano.
 *
 * A diferencia de "Faltantes", acá no hay una matriz que diga qué falta: una tarea
 * puntual no le falta a ningún elemento, es trabajo suelto que alguien decide
 * colgarle a equipos específicos. Por eso el flujo es al revés — primero se elige
 * la tarea y después los elementos.
 *
 * El backend saltea el guard elemento.tipo == tarea.tipo cuando la tarea es ad-hoc
 * (ver ElementoTareaSyncService.GenerarSeleccionadasAsync), así que se puede asignar
 * a elementos de cualquier tipo. Sigue exigiendo que sean del mismo proyecto.
 */
export function TareasPuntualesTab() {
  const [tareaId, setTareaId] = useState("")
  const [sistemaId, setSistemaId] = useState("")
  const [subSistemaId, setSubSistemaId] = useState("")
  const [elementoTipoId, setElementoTipoId] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [resultado, setResultado] = useState<null | {
    creadas: number
    yaExistian: number
    invalidas: number
  }>(null)

  // Solo tareas puntuales — las de la matriz se materializan desde "Faltantes".
  const { data: tareasResp, isLoading: cargandoTareas } = useGetTareas({
    esAdHoc: true,
    pageSize: 500,
  })
  const tareasAdHoc = useMemo(() => tareasResp?.data ?? [], [tareasResp])

  const { data: sistemasResp } = useGetSistemasSelect()
  const { data: subSistemasResp } = useGetSubSistemasSelect()
  const { data: tiposResp } = useGetElementosTiposSelect()

  const { data: elementosResp, isLoading: cargandoElementos } = useGetElementos({
    pageSize: MAX_ELEMENTOS,
    nombre: busqueda || undefined,
    sistemaId: sistemaId || undefined,
    subSistemaId: subSistemaId || undefined,
    elementoTipoId: elementoTipoId || undefined,
  })
  const elementos = useMemo(() => elementosResp?.data ?? [], [elementosResp])
  const totalElementos = elementosResp?.total ?? 0
  const hayMasQueElTope = totalElementos > elementos.length

  const generar = useGenerarSeleccionadas()

  const tareaElegida = tareasAdHoc.find((t) => t.id === tareaId)

  const tareaOptions: ComboboxOption[] = useMemo(
    () => tareasAdHoc.map((t) => ({ value: t.id, label: `${t.codigo} — ${t.nombre}` })),
    [tareasAdHoc],
  )

  const sistemaOptions: ComboboxOption[] = useMemo(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const s of sistemasResp?.data ?? []) opts.push({ value: s.id, label: s.nombre })
    return opts
  }, [sistemasResp])

  // Los subsistemas se acotan al sistema elegido — sino la lista es inmanejable
  // en proyectos grandes.
  const subSistemaOptions: ComboboxOption[] = useMemo(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const ss of subSistemasResp?.data ?? []) {
      if (sistemaId && ss.sistemaId !== sistemaId) continue
      opts.push({ value: ss.id, label: ss.nombre })
    }
    return opts
  }, [subSistemasResp, sistemaId])

  const tipoOptions: ComboboxOption[] = useMemo(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const t of tiposResp?.data ?? []) opts.push({ value: t.id, label: t.nombre })
    return opts
  }, [tiposResp])

  const toggle = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // "Seleccionar todos" opera sobre lo que está a la vista con los filtros
  // actuales, no sobre el proyecto entero.
  const todosVisiblesSeleccionados =
    elementos.length > 0 && elementos.every((e) => seleccionados.has(e.id))

  const toggleTodos = () => {
    setSeleccionados((prev) => {
      if (todosVisiblesSeleccionados) {
        const next = new Set(prev)
        for (const e of elementos) next.delete(e.id)
        return next
      }
      const next = new Set(prev)
      for (const e of elementos) next.add(e.id)
      return next
    })
  }

  const limpiarFiltros = () => {
    setSistemaId("")
    setSubSistemaId("")
    setElementoTipoId("")
    setBusqueda("")
  }

  const asignar = async () => {
    if (!tareaId || seleccionados.size === 0) return
    const items = [...seleccionados].map((elementoId) => ({ elementoId, tareaId }))
    const res = await generar.mutateAsync(items)
    const data = res?.data
    setResultado({
      creadas: data?.creadas ?? 0,
      yaExistian: data?.yaExistian ?? 0,
      invalidas: data?.invalidas ?? 0,
    })
    setSeleccionados(new Set())
  }

  // ── Sin tareas puntuales cargadas: estado vacío con la explicación ──
  if (!cargandoTareas && tareasAdHoc.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center space-y-2">
        <Target className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="text-base font-semibold">No hay tareas puntuales</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Una tarea puntual es un trabajo suelto que se asigna a elementos elegidos a
          mano, en vez de aplicarse a todos los elementos de un tipo. Creá una desde
          el catálogo de tareas tildando <strong>“Tarea puntual”</strong> y volvé acá
          para asignarla.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Paso 1 — qué tarea asignar */}
      <div className="rounded-lg border bg-white p-4 space-y-2">
        <label className="text-sm font-medium">Tarea puntual a asignar</label>
        <div className="max-w-xl">
          <Combobox
            options={tareaOptions}
            value={tareaId}
            onChange={(v) => { setTareaId(v || ""); setResultado(null) }}
            placeholder={cargandoTareas ? "Cargando..." : "Elegí una tarea puntual"}
            searchPlaceholder="Buscar por código o nombre..."
            emptyMessage="No hay tareas puntuales"
            disabled={cargandoTareas}
          />
        </div>
        {tareaElegida && (
          <p className="text-xs text-muted-foreground">
            Nivel {tareaElegida.nivelNombre ?? "—"} · Planilla{" "}
            {tareaElegida.planillaNombre ?? "—"}. Se puede asignar a elementos de
            cualquier tipo.
          </p>
        )}
      </div>

      {/* Resultado de la última asignación */}
      {resultado && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Se crearon <strong>{resultado.creadas}</strong> tarea(s).
            {resultado.yaExistian > 0 && <> {resultado.yaExistian} ya la tenían.</>}
            {resultado.invalidas > 0 && (
              <> {resultado.invalidas} no se pudieron crear (elemento de otro proyecto o dado de baja).</>
            )}
          </span>
        </div>
      )}

      {/* Paso 2 — a qué elementos. Deshabilitado hasta elegir la tarea, para que
          el orden del flujo quede claro. */}
      <div className={tareaId ? "" : "opacity-50 pointer-events-none"}>
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Buscar</label>
              <Input
                placeholder="Tag, nombre o PID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="w-48">
              <label className="text-xs text-muted-foreground">Sistema</label>
              <Combobox
                options={sistemaOptions}
                value={sistemaId || ALL}
                onChange={(v) => {
                  const value = v ?? ALL
                  setSistemaId(value === ALL ? "" : value)
                  // Cambiar de sistema invalida el subsistema elegido.
                  setSubSistemaId("")
                }}
                placeholder="Todos"
              />
            </div>
            <div className="w-48">
              <label className="text-xs text-muted-foreground">Subsistema</label>
              <Combobox
                options={subSistemaOptions}
                value={subSistemaId || ALL}
                onChange={(v) => { const value = v ?? ALL; setSubSistemaId(value === ALL ? "" : value) }}
                placeholder="Todos"
              />
            </div>
            <div className="w-48">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Combobox
                options={tipoOptions}
                value={elementoTipoId || ALL}
                onChange={(v) => { const value = v ?? ALL; setElementoTipoId(value === ALL ? "" : value) }}
                placeholder="Todos"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={limpiarFiltros}>Limpiar</Button>
          </div>

          {hayMasQueElTope && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
              <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Se muestran los primeros <strong>{elementos.length}</strong> de{" "}
                <strong>{totalElementos}</strong> elementos. Afiná los filtros para ver el resto —
                &quot;Seleccionar todos&quot; solo alcanza a los visibles.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {seleccionados.size > 0
                ? `${seleccionados.size} elemento(s) seleccionado(s)`
                : `${elementos.length} elemento(s)`}
            </p>
            <div className="flex items-center gap-2">
              {seleccionados.size > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setSeleccionados(new Set())}>
                  Limpiar selección
                </Button>
              )}
              {/* ConfirmActionDialog no expone un trigger deshabilitado, así que sin
                  selección mostramos un botón muerto en su lugar. */}
              {seleccionados.size === 0 ? (
                <Button size="sm" disabled className="h-9 gap-1">
                  <Target className="h-3.5 w-3.5" /> Asignar
                </Button>
              ) : (
                <ConfirmActionDialog
                  trigger={<><Target className="h-3.5 w-3.5" /> Asignar ({seleccionados.size})</>}
                  triggerClassName="inline-flex items-center gap-1 h-9 rounded-md bg-blue-900 hover:bg-blue-800 text-white px-3 text-sm font-medium cursor-pointer"
                  title={`¿Asignar la tarea a ${seleccionados.size} elemento(s)?`}
                  description={
                    <>Se van a crear <strong>{seleccionados.size}</strong> tarea(s) sobre los
                      elementos seleccionados. Es idempotente: si alguno ya la tiene, no se
                      duplica.
                    </>
                  }
                  confirmText="Asignar"
                  pendingText="Asignando..."
                  onConfirm={asignar}
                />
              )}
            </div>
          </div>

          <DataTableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      checked={todosVisiblesSeleccionados}
                      onChange={toggleTodos}
                      aria-label="Seleccionar todos los visibles"
                    />
                  </TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Subsistema</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargandoElementos ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    </TableCell>
                  </TableRow>
                ) : elementos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                      No hay elementos con esos filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  elementos.map((e) => {
                    const checked = seleccionados.has(e.id)
                    return (
                      <TableRow
                        key={e.id}
                        className={checked ? "bg-blue-50/60" : undefined}
                        onClick={() => toggle(e.id)}
                      >
                        <TableCell onClick={(ev) => ev.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer"
                            checked={checked}
                            onChange={() => toggle(e.id)}
                            aria-label={`Seleccionar ${e.tag}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.tag}</TableCell>
                        <TableCell className="text-sm">{e.nombre}</TableCell>
                        <TableCell className="text-sm">{e.subSistemaNombre ?? "—"}</TableCell>
                        <TableCell className="text-sm">{e.elementoTipoNombre ?? "—"}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </DataTableWrapper>
        </div>
      </div>
    </div>
  )
}
