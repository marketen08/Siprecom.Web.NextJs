"use client"

import { Fragment, useMemo, useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"

import {
  useActualizarEtapa, useActualizarHoja, useActualizarParte, useActualizarPie, useActualizarPunto, useActualizarSeccion,
  useArbol, useCrearEtapa, useCrearHoja, useCrearParte, useCrearPunto, useCrearSeccion, useEliminarEtapa, useEliminarHoja,
  useEliminarParte, useEliminarPunto, useEliminarSeccion, usePlanillasCatalogo, useProcedimientosQaqc,
} from "@/features/qaqc/api/use-qaqc"
import { CLASE_SELECT, Campo, ConfirmarBorrado, ErrorTexto, opcional, TipoBadge } from "@/features/qaqc/components/comunes"
import {
  ALCANCE_LABEL, AlcancePunto, CODIGO_TIPO, TIPOS_PUNTO, TipoPunto, type PieDetalle, type PieEtapa, type PiePunto, type PieWrite,
} from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

/**
 * Editor de la estructura de un PIE: cabecera, partes, hojas, etapas, puntos y el índice
 * del databook. El mismo para una plantilla del catálogo y para el PIE de un proyecto; en
 * el proyecto además se cargan obra, área y código del databook.
 *
 * Lo que ya tiene firmas, registros o documentos no se puede borrar (lo frena el backend
 * con el motivo): un punto así se marca como No aplica desde la ejecución.
 */
export function EditorPie({ pieId, puedeEditar }: { pieId: string; puedeEditar: boolean }) {
  const { data: pie, isLoading, error } = useArbol(pieId)
  const [hojaSel, setHojaSel] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>
  if (error) return <p className="text-sm text-red-600">{(error as Error).message}</p>
  if (!pie) return null
  const hoja = pie.hojasDetalle.find((h) => h.id === hojaSel) ?? pie.hojasDetalle[0]

  return (
    <div className="space-y-5">
      {/* La key reinicia el formulario cuando el PIE cambia en el servidor. */}
      <Cabecera key={`${pie.id}-${pie.updatedAt}`} pie={pie} puedeEditar={puedeEditar} />
      <Partes pie={pie} puedeEditar={puedeEditar} />
      <Hojas pie={pie} hojaId={hoja?.id ?? null} onHoja={setHojaSel} puedeEditar={puedeEditar} />
      {hoja && <Puntos pie={pie} hojaId={hoja.id} puedeEditar={puedeEditar} />}
      <Secciones pie={pie} puedeEditar={puedeEditar} />
    </div>
  )
}

function Tarjeta({ titulo, descripcion, accion, children }: { titulo: string; descripcion?: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">{titulo}</h2>
          {descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>}
        </div>
        {accion}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

// ── Cabecera ────────────────────────────────────────────────────────────

function Cabecera({ pie, puedeEditar }: { pie: PieDetalle; puedeEditar: boolean }) {
  const actualizar = useActualizarPie()
  const inicial = (): PieWrite => ({
    codigo: pie.codigo, nombre: pie.nombre, disciplina: pie.disciplina, revision: pie.revision, obra: pie.obra, area: pie.area,
    codigoDatabook: pie.codigoDatabook, observaciones: pie.observaciones, abreviaturas: pie.abreviaturas,
  })
  const [f, setF] = useState<PieWrite>(inicial)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const esProyecto = !!pie.proyectoId
  const set = (k: keyof PieWrite) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setOk(false); setF({ ...f, [k]: e.target.value }) }

  async function guardar() {
    setError(null)
    try {
      await actualizar.mutateAsync({
        id: pie.id, ...f, codigo: f.codigo.trim(), nombre: f.nombre.trim(), disciplina: opcional(f.disciplina ?? ""), revision: opcional(f.revision ?? ""),
        obra: opcional(f.obra ?? ""), area: opcional(f.area ?? ""), codigoDatabook: opcional(f.codigoDatabook ?? ""),
        observaciones: opcional(f.observaciones ?? ""), abreviaturas: opcional(f.abreviaturas ?? ""),
      })
      setOk(true)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Tarjeta titulo="Documento" descripcion={esProyecto ? "Encabezado del PIE del proyecto, tal como sale en el PDF y en el databook." : "Datos de la plantilla. La obra y el área se completan en cada proyecto."}>
      <div className="grid gap-3 md:grid-cols-4">
        <Campo label="Código"><Input value={f.codigo} onChange={set("codigo")} disabled={!puedeEditar} /></Campo>
        <Campo label="Nombre" className="md:col-span-2"><Input value={f.nombre} onChange={set("nombre")} disabled={!puedeEditar} /></Campo>
        <Campo label="Revisión"><Input value={f.revision ?? ""} onChange={set("revision")} disabled={!puedeEditar} /></Campo>
        <Campo label="Disciplina"><Input value={f.disciplina ?? ""} onChange={set("disciplina")} disabled={!puedeEditar} /></Campo>
        {esProyecto && (
          <>
            <Campo label="Obra"><Input value={f.obra ?? ""} onChange={set("obra")} disabled={!puedeEditar} /></Campo>
            <Campo label="Área"><Input value={f.area ?? ""} onChange={set("area")} disabled={!puedeEditar} /></Campo>
            <Campo label="Código del databook"><Input value={f.codigoDatabook ?? ""} onChange={set("codigoDatabook")} disabled={!puedeEditar} /></Campo>
          </>
        )}
        <Campo label="Abreviaturas de informes" ayuda="Una por línea; van al pie de cada hoja del PDF." className="md:col-span-2">
          <Textarea rows={4} value={f.abreviaturas ?? ""} onChange={set("abreviaturas")} disabled={!puedeEditar} />
        </Campo>
        <Campo label="Observaciones" className="md:col-span-2">
          <Textarea rows={4} value={f.observaciones ?? ""} onChange={set("observaciones")} disabled={!puedeEditar} />
        </Campo>
      </div>
      {puedeEditar && (
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={guardar} disabled={actualizar.isPending || !f.codigo.trim() || !f.nombre.trim()}>{actualizar.isPending ? "Guardando..." : "Guardar documento"}</Button>
          {ok && <span className="text-sm text-green-700">Guardado.</span>}
          <ErrorTexto error={error} />
        </div>
      )}
    </Tarjeta>
  )
}

// ── Partes ──────────────────────────────────────────────────────────────

function Partes({ pie, puedeEditar }: { pie: PieDetalle; puedeEditar: boolean }) {
  const crear = useCrearParte()
  const actualizar = useActualizarParte()
  const eliminar = useEliminarParte()
  const [f, setF] = useState<{ id?: string; nombre: string; rolFirma: string; orden: string } | null>(null)
  const [borrar, setBorrar] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!f) return
    setError(null)
    try {
      const d = { nombre: f.nombre.trim(), rolFirma: opcional(f.rolFirma), orden: f.orden ? Number(f.orden) : null }
      if (f.id) await actualizar.mutateAsync({ id: f.id, ...d })
      else await crear.mutateAsync({ pieId: pie.id, ...d })
      setF(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Tarjeta
      titulo="Partes que intervienen"
      descripcion="Cada parte es una columna de intervención del PIE. Firma quien tenga en el proyecto su rol de firma."
      accion={puedeEditar && <Button size="sm" variant="outline" onClick={() => { setError(null); setF({ nombre: "", rolFirma: "", orden: "" }) }}><Plus className="h-3.5 w-3.5" /> Parte</Button>}
    >
      <div className="flex flex-wrap gap-2">
        {pie.partes.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <span className="text-xs text-muted-foreground tabular-nums">{p.orden}</span>
            <div>
              <div className="font-medium">{p.nombre}</div>
              <div className="text-xs text-muted-foreground">Rol de firma: {p.rolFirma ?? <span className="text-red-600">sin configurar</span>}</div>
            </div>
            {puedeEditar && (
              <>
                <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setF({ id: p.id, nombre: p.nombre, rolFirma: p.rolFirma ?? "", orden: String(p.orden) }) }}><Pencil /></Button>
                <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setBorrar(p.id) }}><Trash2 /></Button>
              </>
            )}
          </div>
        ))}
      </div>
      <Sheet open={f !== null} onOpenChange={(v) => !v && setF(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader><SheetTitle>{f?.id ? "Editar parte" : "Nueva parte"}</SheetTitle><SheetDescription>El rol de firma es el que tiene que tener el usuario en el proyecto para firmar como esta parte.</SheetDescription></SheetHeader>
          {f && (
            <div className="space-y-3 px-4">
              <Campo label="Nombre"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Inspección Cliente" /></Campo>
              <Campo label="Rol de firma"><Input value={f.rolFirma} onChange={(e) => setF({ ...f, rolFirma: e.target.value })} placeholder="Inspección Cliente" /></Campo>
              <Campo label="Orden"><Input type="number" value={f.orden} onChange={(e) => setF({ ...f, orden: e.target.value })} /></Campo>
              <ErrorTexto error={error} />
              <Button className="w-full" onClick={guardar} disabled={!f.nombre.trim() || crear.isPending || actualizar.isPending}>Guardar</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmarBorrado
        abierto={borrar !== null} titulo="Quitar parte" descripcion="Se quitan también sus intervenciones en los puntos." pendiente={eliminar.isPending} error={error}
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => eliminar.mutateAsync(borrar!).then(() => setBorrar(null)).catch((e) => setError(e.message))}
      />
    </Tarjeta>
  )
}

// ── Hojas ───────────────────────────────────────────────────────────────

function Hojas({ pie, hojaId, onHoja, puedeEditar }: { pie: PieDetalle; hojaId: string | null; onHoja: (id: string) => void; puedeEditar: boolean }) {
  const crear = useCrearHoja()
  const actualizar = useActualizarHoja()
  const eliminar = useEliminarHoja()
  const [f, setF] = useState<{ id?: string; numero: string; nombre: string } | null>(null)
  const [borrar, setBorrar] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!f) return
    setError(null)
    try {
      if (f.id) await actualizar.mutateAsync({ id: f.id, numero: opcional(f.numero), nombre: f.nombre.trim() })
      else await crear.mutateAsync({ pieId: pie.id, numero: opcional(f.numero), nombre: f.nombre.trim() })
      setF(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Tarjeta
      titulo="Hojas"
      descripcion="Cada hoja tiene su número de PIE y sus propias firmas finales (E&I, por ejemplo, tiene una por especialidad)."
      accion={puedeEditar && <Button size="sm" variant="outline" onClick={() => { setError(null); setF({ numero: "", nombre: "" }) }}><Plus className="h-3.5 w-3.5" /> Hoja</Button>}
    >
      <div className="flex flex-wrap gap-2">
        {pie.hojasDetalle.map((h) => (
          <div key={h.id} className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${h.id === hojaId ? "border-blue-500 bg-blue-50" : ""}`}>
            <button className="px-1 text-left" onClick={() => onHoja(h.id)}>
              {h.numero && <span className="mr-1 text-xs text-muted-foreground">Nº {h.numero}</span>}<span className="font-medium">{h.nombre}</span>
              <span className="ml-1 text-xs text-muted-foreground">({h.etapas.reduce((a, e) => a + e.puntos.length, 0)})</span>
            </button>
            {puedeEditar && (
              <>
                <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setF({ id: h.id, numero: h.numero ?? "", nombre: h.nombre }) }}><Pencil /></Button>
                <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setBorrar(h.id) }}><Trash2 /></Button>
              </>
            )}
          </div>
        ))}
        {pie.hojasDetalle.length === 0 && <p className="text-sm text-muted-foreground">Sin hojas. Agregá una para empezar a cargar etapas y puntos.</p>}
      </div>
      <Sheet open={f !== null} onOpenChange={(v) => !v && setF(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader><SheetTitle>{f?.id ? "Editar hoja" : "Nueva hoja"}</SheetTitle></SheetHeader>
          {f && (
            <div className="space-y-3 px-4">
              <Campo label="Nº de PIE"><Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} placeholder="05" /></Campo>
              <Campo label="Nombre"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Puesta a tierra" /></Campo>
              <ErrorTexto error={error} />
              <Button className="w-full" onClick={guardar} disabled={!f.nombre.trim() || crear.isPending || actualizar.isPending}>Guardar</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmarBorrado
        abierto={borrar !== null} titulo="Quitar hoja" descripcion="Se quitan sus etapas y puntos." pendiente={eliminar.isPending} error={error}
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => eliminar.mutateAsync(borrar!).then(() => setBorrar(null)).catch((e) => setError(e.message))}
      />
    </Tarjeta>
  )
}

// ── Etapas y puntos ─────────────────────────────────────────────────────

type FormPunto = {
  id?: string
  etapaId: string
  numero: string
  actividad: string
  documentosAplicables: string
  procedimientoId: string
  tipoInforme: string
  frecuencia: string
  criterioAceptacion: string
  observaciones: string
  seccionId: string
  alcance: AlcancePunto
  alcanceDescripcion: string
  /** El punto del proyecto ya tiene ítems cargados: no se puede cambiar el alcance. */
  conItems: boolean
  intervenciones: Record<string, TipoPunto | "">
  planillaIds: string[]
}

function formDe(p: PiePunto | null, etapaId: string, pie: PieDetalle): FormPunto {
  const iv: Record<string, TipoPunto | ""> = {}
  for (const parte of pie.partes) iv[parte.id] = p?.intervenciones.find((i) => i.parteId === parte.id)?.tipo ?? ""
  return {
    id: p?.id, etapaId, numero: p?.numero ?? "", actividad: p?.actividad ?? "", documentosAplicables: p?.documentosAplicables ?? "",
    procedimientoId: p?.procedimientoId ?? "", tipoInforme: p?.tipoInforme ?? "", frecuencia: p?.frecuencia ?? "",
    criterioAceptacion: p?.criterioAceptacion ?? "", observaciones: p?.observaciones ?? "", seccionId: p?.seccionId ?? "",
    alcance: p?.alcance ?? AlcancePunto.Unico, alcanceDescripcion: p?.alcanceDescripcion ?? "", conItems: (p?.itemsTotal ?? 0) > 0,
    intervenciones: iv, planillaIds: p?.planillas.map((x) => x.planillaId) ?? [],
  }
}

function Puntos({ pie, hojaId, puedeEditar }: { pie: PieDetalle; hojaId: string; puedeEditar: boolean }) {
  const hoja = pie.hojasDetalle.find((h) => h.id === hojaId)!
  const crearEtapa = useCrearEtapa()
  const actualizarEtapa = useActualizarEtapa()
  const eliminarEtapa = useEliminarEtapa()
  const eliminarPunto = useEliminarPunto()
  const [fe, setFe] = useState<{ id?: string; numero: string; nombre: string } | null>(null)
  const [fp, setFp] = useState<FormPunto | null>(null)
  const [borrar, setBorrar] = useState<{ tipo: "etapa" | "punto"; id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const secciones = useMemo(() => Object.fromEntries(pie.secciones.map((s) => [s.id, s])), [pie.secciones])

  async function guardarEtapa() {
    if (!fe) return
    setError(null)
    try {
      if (fe.id) await actualizarEtapa.mutateAsync({ id: fe.id, numero: opcional(fe.numero), nombre: fe.nombre.trim() })
      else await crearEtapa.mutateAsync({ hojaId, numero: opcional(fe.numero), nombre: fe.nombre.trim() })
      setFe(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Tarjeta
      titulo={`Etapas y puntos · ${hoja.numero ? `PIE Nº ${hoja.numero} · ` : ""}${hoja.nombre}`}
      descripcion="Por cada parte, el tipo de punto: RD revisión de documentos, IV verificación en proceso, W presencia aleatoria, HP detención obligatoria. Sin tipo, esa parte no firma el punto."
      accion={puedeEditar && <Button size="sm" variant="outline" onClick={() => { setError(null); setFe({ numero: "", nombre: "" }) }}><Plus className="h-3.5 w-3.5" /> Etapa</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="w-14 py-2 text-left font-medium">Nº</th>
              <th className="py-2 text-left font-medium">Actividad</th>
              <th className="w-40 py-2 text-left font-medium">Documentos / informe</th>
              {pie.partes.map((p) => <th key={p.id} className="w-24 py-2 text-left font-medium">{p.nombre}</th>)}
              <th className="w-36 py-2 text-left font-medium">Planillas</th>
              <th className="w-32 py-2 text-left font-medium">Sección</th>
              {puedeEditar && <th className="w-16" />}
            </tr>
          </thead>
          <tbody>
            {hoja.etapas.map((e: PieEtapa) => (
              <Fragment key={e.id}>
                <tr className="border-b bg-slate-50">
                  <td className="py-1.5 font-semibold">{e.numero}</td>
                  <td colSpan={4 + pie.partes.length} className="py-1.5 font-semibold">
                    <div className="flex items-center gap-2">
                      {e.nombre}
                      {puedeEditar && (
                        <>
                          <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setFe({ id: e.id, numero: e.numero ?? "", nombre: e.nombre }) }}><Pencil /></Button>
                          <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setBorrar({ tipo: "etapa", id: e.id }) }}><Trash2 /></Button>
                          <Button size="xs" variant="outline" className="ml-auto" onClick={() => { setError(null); setFp(formDe(null, e.id, pie)) }}><Plus className="h-3 w-3" /> Punto</Button>
                        </>
                      )}
                    </div>
                  </td>
                  {puedeEditar && <td />}
                </tr>
                {e.puntos.map((p) => (
                  <tr key={p.id} className="border-b align-top">
                    <td className="py-2 tabular-nums">{p.numero}</td>
                    <td className="py-2 pr-2">
                      {p.actividad}
                      {p.frecuencia && <div className="text-xs text-muted-foreground">{p.frecuencia}</div>}
                      {p.alcance !== AlcancePunto.Unico && (
                        <div className="mt-0.5 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-800">
                          {ALCANCE_LABEL[p.alcance]}{p.alcanceDescripcion ? ` · ${p.alcanceDescripcion}` : ""}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-xs">{p.procedimientoCodigo ?? p.documentosAplicables ?? "—"}<div className="text-muted-foreground">{p.tipoInforme}</div></td>
                    {pie.partes.map((parte) => <td key={parte.id} className="py-2"><TipoBadge tipo={p.intervenciones.find((i) => i.parteId === parte.id)?.tipo} /></td>)}
                    <td className="py-2 text-xs">{p.planillas.length ? p.planillas.map((x) => x.codigo ?? x.nombre).join(", ") : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 text-xs">{p.seccionId ? `${secciones[p.seccionId]?.numero ?? ""} ${secciones[p.seccionId]?.nombre ?? ""}` : <span className="text-muted-foreground">—</span>}</td>
                    {puedeEditar && (
                      <td className="py-2 text-right whitespace-nowrap">
                        <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setFp(formDe(p, e.id, pie)) }}><Pencil /></Button>
                        <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setBorrar({ tipo: "punto", id: p.id }) }}><Trash2 /></Button>
                      </td>
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
            {hoja.etapas.length === 0 && <tr><td colSpan={6 + pie.partes.length} className="py-6 text-center text-muted-foreground">Sin etapas.</td></tr>}
          </tbody>
        </table>
      </div>

      <Sheet open={fe !== null} onOpenChange={(v) => !v && setFe(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader><SheetTitle>{fe?.id ? "Editar etapa" : "Nueva etapa"}</SheetTitle></SheetHeader>
          {fe && (
            <div className="space-y-3 px-4">
              <Campo label="Número"><Input value={fe.numero} onChange={(e) => setFe({ ...fe, numero: e.target.value })} placeholder="3" /></Campo>
              <Campo label="Nombre"><Input value={fe.nombre} onChange={(e) => setFe({ ...fe, nombre: e.target.value })} placeholder="Controles de montaje" /></Campo>
              <ErrorTexto error={error} />
              <Button className="w-full" onClick={guardarEtapa} disabled={!fe.nombre.trim() || crearEtapa.isPending || actualizarEtapa.isPending}>Guardar</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {fp && <PuntoForm pie={pie} hojaId={hojaId} inicial={fp} onCerrar={() => setFp(null)} />}

      <ConfirmarBorrado
        abierto={borrar !== null}
        titulo={borrar?.tipo === "etapa" ? "Quitar etapa" : "Quitar punto"}
        descripcion={borrar?.tipo === "etapa" ? "Se quitan también sus puntos." : "El punto deja de estar en el PIE."}
        pendiente={eliminarEtapa.isPending || eliminarPunto.isPending}
        error={error}
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => (borrar!.tipo === "etapa" ? eliminarEtapa.mutateAsync(borrar!.id) : eliminarPunto.mutateAsync(borrar!.id))
          .then(() => setBorrar(null)).catch((e) => setError(e.message))}
      />
    </Tarjeta>
  )
}

function PuntoForm({ pie, hojaId, inicial, onCerrar }: { pie: PieDetalle; hojaId: string; inicial: FormPunto; onCerrar: () => void }) {
  const crear = useCrearPunto()
  const actualizar = useActualizarPunto()
  const procedimientos = useProcedimientosQaqc()
  const planillas = usePlanillasCatalogo()
  const [f, setF] = useState<FormPunto>(inicial)
  const [buscar, setBuscar] = useState("")
  const [error, setError] = useState<string | null>(null)
  const etapas = pie.hojasDetalle.find((h) => h.id === hojaId)?.etapas ?? []
  const proc = (procedimientos.data ?? []).find((p) => p.id === f.procedimientoId)
  const sugeridas = (proc?.registros ?? []).filter((r) => r.planillaId && !f.planillaIds.includes(r.planillaId))
  const nombrePlanilla = (id: string) => {
    const p = (planillas.data ?? []).find((x) => x.id === id)
    return p ? `${p.codigo ?? ""} ${p.nombre}`.trim() : id
  }
  const filtradas = buscar.trim().length < 2 ? [] : (planillas.data ?? [])
    .filter((p) => !f.planillaIds.includes(p.id) && `${p.codigo} ${p.nombre}`.toLowerCase().includes(buscar.toLowerCase())).slice(0, 8)
  const set = (k: keyof FormPunto) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  async function guardar() {
    setError(null)
    const d = {
      etapaId: f.etapaId, numero: opcional(f.numero), actividad: f.actividad.trim(), documentosAplicables: opcional(f.documentosAplicables),
      procedimientoId: opcional(f.procedimientoId), tipoInforme: opcional(f.tipoInforme), frecuencia: opcional(f.frecuencia),
      criterioAceptacion: opcional(f.criterioAceptacion), observaciones: opcional(f.observaciones), seccionId: opcional(f.seccionId),
      alcance: f.alcance, alcanceDescripcion: f.alcance === AlcancePunto.Unico ? null : opcional(f.alcanceDescripcion),
      intervenciones: Object.entries(f.intervenciones).filter(([, t]) => t !== "").map(([parteId, tipo]) => ({ parteId, tipo: tipo as TipoPunto })),
      planillaIds: f.planillaIds,
    }
    try {
      if (f.id) await actualizar.mutateAsync({ id: f.id, ...d })
      else await crear.mutateAsync(d)
      onCerrar()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-xl! overflow-y-auto">
        <SheetHeader><SheetTitle>{f.id ? `Editar punto ${f.numero}` : "Nuevo punto"}</SheetTitle><SheetDescription>Un renglón del PIE: qué se controla, con qué documento y registro, y cómo interviene cada parte.</SheetDescription></SheetHeader>
        <div className="grid gap-3 px-4 pb-8 sm:grid-cols-4">
          <Campo label="Nº"><Input value={f.numero} onChange={set("numero")} placeholder="3.13" /></Campo>
          <Campo label="Etapa" className="sm:col-span-3">
            <select className={CLASE_SELECT} value={f.etapaId} onChange={set("etapaId")}>
              {etapas.map((e) => <option key={e.id} value={e.id}>{e.numero} {e.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Actividad" className="sm:col-span-4"><Textarea rows={2} value={f.actividad} onChange={set("actividad")} /></Campo>
          <Campo label="Documentos aplicables" className="sm:col-span-2"><Input value={f.documentosAplicables} onChange={set("documentosAplicables")} placeholder="Procedimiento, norma, s/ plano" /></Campo>
          <Campo label="Procedimiento del catálogo" className="sm:col-span-2">
            <select className={CLASE_SELECT} value={f.procedimientoId} onChange={set("procedimientoId")}>
              <option value="">—</option>
              {(procedimientos.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.codigo ?? "s/código"} · {p.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Tipo de informe a generar" className="sm:col-span-2"><Input value={f.tipoInforme} onChange={set("tipoInforme")} /></Campo>
          <Campo label="Frecuencia" className="sm:col-span-2"><Input value={f.frecuencia} onChange={set("frecuencia")} placeholder="100%, Cada lote, En cada actividad" /></Campo>
          <Campo label="Criterio de aceptación" className="sm:col-span-2"><Input value={f.criterioAceptacion} onChange={set("criterioAceptacion")} /></Campo>
          <Campo label="Sección del databook" className="sm:col-span-2" ayuda="Vacío: la de su hoja, o la última.">
            <select className={CLASE_SELECT} value={f.seccionId} onChange={set("seccionId")}>
              <option value="">—</option>
              {pie.secciones.map((s) => <option key={s.id} value={s.id}>{s.numero} {s.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Alcance" className="sm:col-span-2"
            ayuda={f.conItems ? "Ya tiene ítems cargados: quitalos antes de cambiarlo." : "Por elemento / grupo: se chequea en cada uno y necesita planilla."}>
            <select className={CLASE_SELECT} value={f.alcance} disabled={f.conItems}
              onChange={(e) => setF({ ...f, alcance: Number(e.target.value) as AlcancePunto })}>
              {[AlcancePunto.Unico, AlcancePunto.PorElemento, AlcancePunto.PorGrupo].map((a) => <option key={a} value={a}>{ALCANCE_LABEL[a]}</option>)}
            </select>
          </Campo>
          {f.alcance !== AlcancePunto.Unico && (
            <Campo label="Qué se chequea" className="sm:col-span-2">
              <Input value={f.alcanceDescripcion} onChange={set("alcanceDescripcion")} placeholder={f.alcance === AlcancePunto.PorGrupo ? "cada test pack" : "cada cable, cada brida…"} />
            </Campo>
          )}

          <div className="sm:col-span-4">
            <label className="text-sm font-medium">Intervención de cada parte</label>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {pie.partes.map((parte) => (
                <div key={parte.id} className="flex items-center gap-2 rounded-md border p-2">
                  <span className="flex-1 text-sm">{parte.nombre}</span>
                  <select
                    className={`${CLASE_SELECT} w-44`}
                    value={f.intervenciones[parte.id] === "" ? "" : String(f.intervenciones[parte.id])}
                    onChange={(e) => setF({ ...f, intervenciones: { ...f.intervenciones, [parte.id]: e.target.value === "" ? "" : Number(e.target.value) as TipoPunto } })}
                  >
                    <option value="">No interviene</option>
                    {TIPOS_PUNTO.map((t) => <option key={t.valor} value={t.valor}>{CODIGO_TIPO[t.valor]} · {t.nombre}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="sm:col-span-4">
            <label className="text-sm font-medium">Planillas con que se registra</label>
            <p className="text-xs text-muted-foreground">Con alguna planilla, el punto pide al menos un registro firmado antes de firmarse.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.planillaIds.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 rounded border bg-slate-50 px-2 py-0.5 text-xs">
                  {nombrePlanilla(id)}
                  <button onClick={() => setF({ ...f, planillaIds: f.planillaIds.filter((x) => x !== id) })}><X className="h-3 w-3" /></button>
                </span>
              ))}
              {f.planillaIds.length === 0 && <span className="text-xs text-muted-foreground">Ninguna.</span>}
            </div>
            {sugeridas.length > 0 && (
              <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 p-2 text-xs">
                <span className="text-blue-900">Registros anexos del procedimiento {proc?.codigo}:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {sugeridas.map((r) => (
                    <button key={r.id} className="rounded border border-blue-200 bg-white px-2 py-0.5 hover:bg-blue-100" onClick={() => setF({ ...f, planillaIds: [...f.planillaIds, r.planillaId!] })}>
                      + {r.codigo} {r.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Input className="mt-2" placeholder="Buscar planilla por código o nombre…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            {filtradas.length > 0 && (
              <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border text-sm">
                {filtradas.map((p) => (
                  <li key={p.id}><button className="w-full px-2 py-1 text-left hover:bg-slate-50" onClick={() => { setF({ ...f, planillaIds: [...f.planillaIds, p.id] }); setBuscar("") }}>{p.codigo} · {p.nombre}</button></li>
                ))}
              </ul>
            )}
          </div>

          <Campo label="Observaciones" className="sm:col-span-4"><Input value={f.observaciones} onChange={set("observaciones")} /></Campo>
          <div className="sm:col-span-4 space-y-2">
            <ErrorTexto error={error} />
            <Button className="w-full" onClick={guardar} disabled={!f.actividad.trim() || crear.isPending || actualizar.isPending}>
              {crear.isPending || actualizar.isPending ? "Guardando..." : "Guardar punto"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Índice del databook ─────────────────────────────────────────────────

function Secciones({ pie, puedeEditar }: { pie: PieDetalle; puedeEditar: boolean }) {
  const crear = useCrearSeccion()
  const actualizar = useActualizarSeccion()
  const eliminar = useEliminarSeccion()
  const [f, setF] = useState<{ id?: string; numero: string; nombre: string; hojaId: string; incluyePlan: boolean } | null>(null)
  const [borrar, setBorrar] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!f) return
    setError(null)
    const d = { numero: opcional(f.numero), nombre: f.nombre.trim(), hojaId: opcional(f.hojaId), incluyePlan: f.incluyePlan }
    try {
      if (f.id) await actualizar.mutateAsync({ id: f.id, ...d })
      else await crear.mutateAsync({ pieId: pie.id, ...d })
      setF(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Tarjeta
      titulo="Índice del databook"
      descripcion="Las secciones del databook de calidad. Con hoja, agrupa los registros de esa hoja; sin hoja, es temática. 'Incluye PIE' arranca la sección con el PIE firmado."
      accion={puedeEditar && <Button size="sm" variant="outline" onClick={() => { setError(null); setF({ numero: "", nombre: "", hojaId: "", incluyePlan: false }) }}><Plus className="h-3.5 w-3.5" /> Sección</Button>}
    >
      {pie.secciones.length === 0
        ? <p className="text-sm text-muted-foreground">Sin índice: el databook sale con dos secciones, el PIE y los registros.</p>
        : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="border-b"><th className="w-14 py-2 text-left font-medium">Nº</th><th className="py-2 text-left font-medium">Sección</th><th className="py-2 text-left font-medium">Hoja</th><th className="py-2 text-left font-medium">PIE firmado</th>{puedeEditar && <th className="w-16" />}</tr></thead>
            <tbody>
              {pie.secciones.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="py-1.5">{s.numero}</td>
                  <td className="py-1.5">{s.nombre}</td>
                  <td className="py-1.5 text-xs">{s.hojaId ? pie.hojasDetalle.find((h) => h.id === s.hojaId)?.nombre : "—"}</td>
                  <td className="py-1.5 text-xs">{s.incluyePlan ? "Sí" : ""}</td>
                  {puedeEditar && (
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setF({ id: s.id, numero: s.numero ?? "", nombre: s.nombre, hojaId: s.hojaId ?? "", incluyePlan: s.incluyePlan }) }}><Pencil /></Button>
                      <Button size="icon-xs" variant="ghost" onClick={() => { setError(null); setBorrar(s.id) }}><Trash2 /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      <Sheet open={f !== null} onOpenChange={(v) => !v && setF(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader><SheetTitle>{f?.id ? "Editar sección" : "Nueva sección"}</SheetTitle></SheetHeader>
          {f && (
            <div className="space-y-3 px-4">
              <Campo label="Nº"><Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} /></Campo>
              <Campo label="Nombre"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Trazabilidad" /></Campo>
              <Campo label="Hoja (opcional)">
                <select className={CLASE_SELECT} value={f.hojaId} onChange={(e) => setF({ ...f, hojaId: e.target.value })}>
                  <option value="">— temática —</option>
                  {pie.hojasDetalle.map((h) => <option key={h.id} value={h.id}>{h.numero ? `Nº ${h.numero} ` : ""}{h.nombre}</option>)}
                </select>
              </Campo>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={f.incluyePlan} onChange={(e) => setF({ ...f, incluyePlan: e.target.checked })} /> Arranca con el PIE firmado</label>
              <ErrorTexto error={error} />
              <Button className="w-full" onClick={guardar} disabled={!f.nombre.trim() || crear.isPending || actualizar.isPending}>Guardar</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmarBorrado
        abierto={borrar !== null} titulo="Quitar sección" descripcion="Los puntos que caían acá pasan a la sección de su hoja o a la última." pendiente={eliminar.isPending} error={error}
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => eliminar.mutateAsync(borrar!).then(() => setBorrar(null)).catch((e) => setError(e.message))}
      />
    </Tarjeta>
  )
}
