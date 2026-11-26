"use client"

import { useState } from "react"
import { CheckCircle2, CircleAlert, Pencil, Plus, Trash2 } from "lucide-react"

import { reglas as api, useEstadoCierre, useReglas, useTareasCatalogo } from "@/features/soldadura/api/use-cierre"
import { ESTADO_TAREA_LABEL, REGLA_CIERRE, ReglaCierre, type TareaRegla } from "@/features/soldadura/types-cierre"
import { CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia, usePermisosSoldadura } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Form {
  id?: string
  tareaId: string
  regla: ReglaCierre
}

/**
 * Las tareas del PIE que se cierran con los datos de soldadura. La regla no cierra la
 * tarea sola: impide cerrarla —por cualquier camino— mientras no se cumpla, y al cerrarla
 * adjunta al registro los PDF de soldadura que entran al databook.
 */
export default function CierrePage() {
  const estado = useEstadoCierre()
  const reglas = useReglas()
  const tareas = useTareasCatalogo()
  const crear = api.useCreate()
  const actualizar = api.useUpdate()
  const borrar = api.useDelete()
  const { parametros } = usePermisosSoldadura()

  const [form, setForm] = useState<Form | null>(null)
  const [aBorrar, setABorrar] = useState<TareaRegla | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [soloPendientes, setSoloPendientes] = useState(true)

  const filas = (estado.data ?? []).filter((f) => !soloPendientes || !f.cerrada)
  const listas = (estado.data ?? []).filter((f) => !f.cerrada && f.cumple).length
  const frenadas = (estado.data ?? []).filter((f) => !f.cerrada && !f.cumple).length
  const conRegla = new Set((reglas.data ?? []).map((r) => r.tareaId))

  async function guardar() {
    if (!form) return
    setError(null)
    try {
      if (form.id) await actualizar.mutateAsync({ id: form.id, tareaId: form.tareaId, regla: form.regla })
      else await crear.mutateAsync({ tareaId: form.tareaId, regla: form.regla })
      setForm(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Cierre de tareas"
        descripcion="Las tareas del PIE que se cierran con los datos de soldadura. Mientras la regla no se cumpla, la tarea no se puede cerrar por ningún camino; al cerrarla, los registros de soldadura se adjuntan en PDF a su registro y entran al databook."
      >
        <Button className="gap-2" disabled={!parametros} onClick={() => { setError(null); setForm({ tareaId: "", regla: ReglaCierre.Trazabilidad }) }}>
          <Plus className="h-4 w-4" /> Nueva regla
        </Button>
      </Encabezado>

      {/* ── Tablero ─────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <h2 className="text-base font-semibold">Tablero</h2>
          <span className="text-green-700"><strong className="tabular-nums">{listas}</strong> listas para cerrar</span>
          <span className="text-amber-800"><strong className="tabular-nums">{frenadas}</strong> frenadas</span>
          <label className="ml-auto flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
            Solo las que no están cerradas
          </label>
        </div>
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44 font-semibold text-gray-700">Tag</TableHead>
                <TableHead className="font-semibold text-gray-700">Tarea</TableHead>
                <TableHead className="w-44 font-semibold text-gray-700">Estado de la tarea</TableHead>
                <TableHead className="font-semibold text-gray-700">Regla de soldadura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estado.isLoading || filas.length === 0 ? (
                <FilaVacia columnas={4} cargando={estado.isLoading}
                  vacio={(reglas.data ?? []).length === 0 ? "Todavía no hay reglas: agregá una para ver sus tareas acá." : "No hay tareas para mostrar."} />
              ) : filas.map((f) => (
                <TableRow key={f.elementoTareaId}>
                  <TableCell className="font-mono text-sm font-medium">{f.elementoTag}</TableCell>
                  <TableCell className="text-sm">
                    {f.tareaNombre}
                    <span className="block text-xs text-muted-foreground">{REGLA_CIERRE[f.regla].label}</span>
                  </TableCell>
                  <TableCell className="text-sm">{ESTADO_TAREA_LABEL[f.estadoTarea] ?? f.estadoTarea}</TableCell>
                  <TableCell className="text-sm">
                    {f.cumple ? (
                      <span className="inline-flex items-center gap-1.5 text-green-700"><CheckCircle2 className="h-4 w-4" /> Se cumple</span>
                    ) : (
                      <span className="inline-flex items-start gap-1.5 text-amber-800"><CircleAlert className="h-4 w-4 mt-0.5 shrink-0" /> <span className="first-letter:uppercase">{f.motivo}</span></span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Reglas ──────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Reglas</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Tarea del catálogo</TableHead>
                <TableHead className="font-semibold text-gray-700">Regla</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700 text-right">Instancias</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reglas.isLoading || (reglas.data ?? []).length === 0 ? (
                <FilaVacia columnas={4} cargando={reglas.isLoading} vacio="No hay reglas de cierre." />
              ) : (reglas.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground mr-1.5">{r.tareaCodigo}</span>{r.tareaNombre}
                    <span className="block text-xs text-muted-foreground">{[r.elementoTipo, r.nivel].filter(Boolean).join(" · ")}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {REGLA_CIERRE[r.regla].label}
                    <span className="block text-xs text-muted-foreground">{REGLA_CIERRE[r.regla].detalle}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.instancias}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} title="Editar"
                      onClick={() => { setError(null); setForm({ id: r.id, tareaId: r.tareaId, regla: r.regla }) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros} title="Eliminar"
                      onClick={() => { setError(null); setABorrar(r) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Sheet open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Editar regla" : "Nueva regla"}</SheetTitle>
            <SheetDescription>Una regla por tarea. Las de línea miran las líneas que cuelgan del tag de cada tarea; las documentales, los catálogos del proyecto.</SheetDescription>
          </SheetHeader>
          {form && (
            <div className="mt-6 px-4 space-y-3">
              <Campo label="Tarea del catálogo">
                <select value={form.tareaId} onChange={(e) => setForm({ ...form, tareaId: e.target.value })} className={CLASE_SELECT}>
                  <option value="">Elegí…</option>
                  {(tareas.data ?? []).filter((t) => t.id === form.tareaId || !conRegla.has(t.id)).map((t) => (
                    <option key={t.id} value={t.id}>{t.codigo} — {t.nombre}{t.elementoTipo ? ` (${t.elementoTipo})` : ""}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Regla">
                <select value={form.regla} onChange={(e) => setForm({ ...form, regla: Number(e.target.value) as ReglaCierre })} className={CLASE_SELECT}>
                  {Object.entries(REGLA_CIERRE).map(([v, r]) => <option key={v} value={v}>{r.label}</option>)}
                </select>
              </Campo>
              <div className="rounded-md bg-gray-50 border p-3 text-xs space-y-1.5">
                <p><strong>Para cerrar:</strong> {REGLA_CIERRE[form.regla].detalle}</p>
                <p><strong>Adjunta:</strong> {REGLA_CIERRE[form.regla].adjunta}</p>
              </div>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardar} disabled={!form.tareaId || crear.isPending || actualizar.isPending}>
                  {crear.isPending || actualizar.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Eliminar regla"
        descripcion={<>¿Quitar la regla de <strong>{aBorrar?.tareaNombre}</strong>? La tarea se va a poder cerrar sin mirar los datos de soldadura.</>}
        pendiente={borrar.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => { try { await borrar.mutateAsync(aBorrar!.id); setABorrar(null) } catch (e) { setError((e as Error).message) } }}
      />
    </div>
  )
}
