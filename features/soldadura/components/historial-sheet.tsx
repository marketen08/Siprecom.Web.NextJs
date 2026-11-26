"use client"

import { useState } from "react"
import { Gauge, Plus, Trash2, Wrench, X } from "lucide-react"

import { soldadores as apiSoldadores, wps as apiWps } from "@/features/soldadura/api/use-soldadura"
import { useControl, useEliminarControl, useHistorial, useReparacion } from "@/features/soldadura/api/use-inspeccion"
import { fechaCorta } from "@/features/soldadura/types"
import { ESTADO_JUNTA, EstadoJunta, PASADA_LABEL, PasadaJunta, ResultadoHabilitacion } from "@/features/soldadura/types-juntas"
import { METODO_LABEL, MOTIVO_LABEL, ResultadoEnsayo, type Ensayo } from "@/features/soldadura/types-inspeccion"
import { CLASE_SELECT, Campo, ErrorTexto, numero, opcional, usePermisosSoldadura } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const hoy = () => new Date().toISOString().slice(0, 10)

/**
 * La historia de una junta, ciclo por ciclo: quién soldó, la visual, los ensayos y sus
 * resultados, y la reparación que abrió cada ciclo nuevo. Desde acá se registra la
 * reparación de una junta rechazada y el control de parámetros.
 */
export function HistorialSheet({ juntaId, onCerrar }: { juntaId: string; onCerrar: () => void }) {
  const { data: h, isLoading } = useHistorial(juntaId)
  const { padron } = usePermisosSoldadura()
  const [panel, setPanel] = useState<"reparacion" | "control" | null>(null)

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-3xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Junta <span className="font-mono">{h?.identificacion ?? "…"}</span>
            {h && <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_JUNTA[h.estado].clase}`}>{ESTADO_JUNTA[h.estado].label}</span>}
          </SheetTitle>
          <SheetDescription>Cada reparación abre un ciclo nuevo sobre la misma junta, con sus soldadores, su visual y su reensayo.</SheetDescription>
        </SheetHeader>

        {isLoading || !h ? <p className="px-4 mt-6 text-sm text-muted-foreground">Cargando...</p> : (
          <div className="mt-4 px-4 pb-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={panel === "reparacion" ? "default" : "outline"} className="gap-1.5"
                disabled={!padron || h.estado !== EstadoJunta.Rechazada}
                title={h.estado !== EstadoJunta.Rechazada ? "Solo se repara una junta rechazada." : undefined}
                onClick={() => setPanel(panel === "reparacion" ? null : "reparacion")}>
                <Wrench className="h-4 w-4" /> Registrar reparación
              </Button>
              <Button size="sm" variant={panel === "control" ? "default" : "outline"} className="gap-1.5" disabled={!padron}
                onClick={() => setPanel(panel === "control" ? null : "control")}>
                <Gauge className="h-4 w-4" /> Control de parámetros
              </Button>
            </div>

            {panel === "reparacion" && <FormReparacion juntaId={juntaId} onListo={() => setPanel(null)} />}
            {panel === "control" && <FormControl juntaId={juntaId} onListo={() => setPanel(null)} />}

            {h.ciclos.slice().reverse().map((c) => (
              <div key={c.ciclo} className="rounded-md border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-3 py-2">
                  <p className="text-sm font-medium">
                    {c.ciclo === 0 ? "Soldadura original" : `Reparación ${c.ciclo}`}
                    <span className="ml-2 font-normal text-muted-foreground">{fechaCorta(c.fecha)}{c.wpsTexto ? ` · ${c.wpsTexto}` : ""}</span>
                  </p>
                  {c.defecto && <span className="text-xs text-red-700">Defecto: {c.defecto}</span>}
                </div>
                <div className="p-3 space-y-3">
                  <div className="text-sm">
                    {c.soldadores.length === 0 ? <span className="text-muted-foreground">Sin soldadores.</span> : c.soldadores.map((s) => (
                      <div key={s.id} className="flex flex-wrap gap-x-2">
                        <span className="font-mono">{s.cuno}</span>
                        <span className="text-muted-foreground">{PASADA_LABEL[s.pasada]}{s.proceso ? ` · ${s.proceso}` : ""}</span>
                        <span className={s.resultado === ResultadoHabilitacion.NoHabilitado ? "text-red-700" : s.resultado === ResultadoHabilitacion.ConAdvertencia ? "text-amber-700" : "text-green-700"}>
                          {s.resultado === ResultadoHabilitacion.NoHabilitado ? `no habilitado${s.forzar ? " (forzado)" : ""}` : s.resultado === ResultadoHabilitacion.ConAdvertencia ? "con advertencia" : "habilitado"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <TablaEnsayos ensayos={c.ensayos} />
                </div>
              </div>
            ))}

            <div>
              <p className="text-sm font-medium mb-1">Controles de parámetros</p>
              <TablaControles controles={h.controles} puedeBorrar={padron} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function TablaEnsayos({ ensayos }: { ensayos: Ensayo[] }) {
  if (ensayos.length === 0) return <p className="text-xs text-muted-foreground">Sin inspecciones ni ensayos en este ciclo.</p>
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr className="text-left"><th className="py-1 font-medium">Método</th><th className="py-1 font-medium">Motivo</th><th className="py-1 font-medium">Resultado</th><th className="py-1 font-medium">Fecha</th><th className="py-1 font-medium">Informe / lote</th><th className="py-1 font-medium">Defecto</th></tr>
      </thead>
      <tbody>
        {ensayos.map((e) => (
          <tr key={e.id} className="border-t">
            <td className="py-1 font-mono">{METODO_LABEL[e.metodo]}</td>
            <td className="py-1">{MOTIVO_LABEL[e.motivo]}</td>
            <td className={`py-1 font-medium ${e.resultado === ResultadoEnsayo.Rechazada ? "text-red-700" : e.resultado === ResultadoEnsayo.Aceptada ? "text-green-700" : "text-amber-700"}`}>
              {e.resultado === ResultadoEnsayo.Rechazada ? "Rechazada" : e.resultado === ResultadoEnsayo.Aceptada ? "Aceptada" : "Pendiente"}
              {e.noConformidadId && <span className="ml-1 font-normal text-muted-foreground">(NC)</span>}
            </td>
            <td className="py-1 tabular-nums">{fechaCorta(e.fecha)}</td>
            <td className="py-1">{[e.informeNumero, e.loteNumero ? `lote ${e.loteNumero}` : null, e.solicitudNumero ? `sol. ${e.solicitudNumero}` : null].filter(Boolean).join(" · ") || "—"}</td>
            <td className="py-1">{e.defecto ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TablaControles({ controles, puedeBorrar }: { controles: { id: string; fecha: string; pasada: PasadaJunta; cuno: string | null; amperaje?: number | null; voltaje?: number | null; fueraDeRango: boolean; detalle: string }[]; puedeBorrar: boolean }) {
  const borrar = useEliminarControl()
  if (controles.length === 0) return <p className="text-xs text-muted-foreground">Sin controles.</p>
  return (
    <table className="w-full text-xs">
      <tbody>
        {controles.map((c) => (
          <tr key={c.id} className="border-t align-top">
            <td className="py-1 tabular-nums w-20">{fechaCorta(c.fecha)}</td>
            <td className="py-1 w-36">{PASADA_LABEL[c.pasada]}{c.cuno ? ` · ${c.cuno}` : ""}</td>
            <td className="py-1 w-24 tabular-nums">{c.amperaje != null ? `${c.amperaje} A` : ""}{c.voltaje != null ? ` ${c.voltaje} V` : ""}</td>
            <td className={`py-1 ${c.fueraDeRango ? "text-red-700" : "text-green-700"}`}>{c.detalle}</td>
            <td className="py-1 w-8">
              {puedeBorrar && <Button size="icon" variant="ghost" className="h-6 w-6" title="Eliminar" onClick={() => borrar.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FormReparacion({ juntaId, onListo }: { juntaId: string; onListo: () => void }) {
  const soldadores = apiSoldadores.useList()
  const wps = apiWps.useList()
  const reparar = useReparacion()
  const [fecha, setFecha] = useState(hoy())
  const [defecto, setDefecto] = useState("")
  const [wpsId, setWpsId] = useState("")
  const [filas, setFilas] = useState([{ soldadorProyectoId: "", pasada: PasadaJunta.Completa, proceso: "", forzar: false, motivoForzado: "" }])
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setError(null)
    try {
      await reparar.mutateAsync({
        juntaId, fecha, defecto: opcional(defecto), wpsId: wpsId || null,
        soldadores: filas.filter((f) => f.soldadorProyectoId).map((f) => ({ ...f, proceso: opcional(f.proceso), motivoForzado: opcional(f.motivoForzado) })),
      })
      onListo()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3 space-y-3">
      <p className="text-sm font-medium">Reparación</p>
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Fecha"><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
        <Campo label="Defecto reparado"><Input value={defecto} onChange={(e) => setDefecto(e.target.value)} placeholder="Del rechazo" /></Campo>
        <Campo label="WPS de reparación">
          <select value={wpsId} onChange={(e) => setWpsId(e.target.value)} className={CLASE_SELECT}>
            <option value="">El de la junta</option>
            {(wps.data ?? []).map((w) => <option key={w.id} value={w.id}>{w.codigo} rev. {w.revision}</option>)}
          </select>
        </Campo>
      </div>
      {filas.map((f, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <Campo label="Soldador" className="flex-1 min-w-48">
            <select value={f.soldadorProyectoId} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, soldadorProyectoId: e.target.value } : x)))} className={CLASE_SELECT}>
              <option value="">Elegí…</option>
              {(soldadores.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.cuno} — {s.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Pasada" className="w-44">
            <select value={f.pasada} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, pasada: Number(e.target.value) as PasadaJunta } : x)))} className={CLASE_SELECT}>
              {Object.entries(PASADA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Proceso" className="w-24"><Input value={f.proceso} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, proceso: e.target.value } : x)))} className="uppercase" placeholder="del WPS" /></Campo>
          <label className="flex items-center gap-1 text-xs pb-2.5 cursor-pointer">
            <input type="checkbox" checked={f.forzar} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, forzar: e.target.checked } : x)))} /> forzar
          </label>
          {f.forzar && <Input className="h-9 w-48" placeholder="Motivo" value={f.motivoForzado} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, motivoForzado: e.target.value } : x)))} />}
          {filas.length > 1 && <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setFilas(filas.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}
        </div>
      ))}
      <Button size="sm" variant="ghost" className="gap-1" onClick={() => setFilas([...filas, { soldadorProyectoId: "", pasada: PasadaJunta.RellenoTerminacion, proceso: "", forzar: false, motivoForzado: "" }])}>
        <Plus className="h-3.5 w-3.5" /> Soldador
      </Button>
      <ErrorTexto error={error} />
      <Button size="sm" onClick={guardar} disabled={reparar.isPending || !filas.some((f) => f.soldadorProyectoId)}>
        {reparar.isPending ? "Guardando..." : "Registrar reparación"}
      </Button>
    </div>
  )
}

function FormControl({ juntaId, onListo }: { juntaId: string; onListo: () => void }) {
  const soldadores = apiSoldadores.useList()
  const control = useControl()
  const [f, setF] = useState({ fecha: hoy(), soldadorProyectoId: "", pasada: PasadaJunta.Raiz, proceso: "", aporte: "", amperaje: "", voltaje: "", velocidad: "", polaridad: "", precal: "", interpasada: "", inspector: "" })
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)

  async function guardar() {
    setError(null)
    try {
      const r = await control.mutateAsync({
        juntaId, fecha: f.fecha, soldadorProyectoId: f.soldadorProyectoId || null, pasada: f.pasada, proceso: opcional(f.proceso),
        aporte: opcional(f.aporte), amperaje: numero(f.amperaje), voltaje: numero(f.voltaje), velocidad: numero(f.velocidad),
        polaridad: opcional(f.polaridad), temperaturaPrecalentamiento: numero(f.precal), temperaturaInterpasada: numero(f.interpasada),
        inspector: opcional(f.inspector),
      })
      setResultado(r.data.detalle)
      if (!r.data.fueraDeRango) onListo()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <p className="text-sm font-medium">Control de parámetros</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Campo label="Fecha"><Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
        <Campo label="Soldador">
          <select value={f.soldadorProyectoId} onChange={(e) => setF({ ...f, soldadorProyectoId: e.target.value })} className={CLASE_SELECT}>
            <option value="">—</option>
            {(soldadores.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.cuno}</option>)}
          </select>
        </Campo>
        <Campo label="Pasada">
          <select value={f.pasada} onChange={(e) => setF({ ...f, pasada: Number(e.target.value) as PasadaJunta })} className={CLASE_SELECT}>
            {Object.entries(PASADA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Campo>
        <Campo label="Proceso"><Input value={f.proceso} onChange={(e) => setF({ ...f, proceso: e.target.value })} className="uppercase" /></Campo>
        <Campo label="Electrodo"><Input value={f.aporte} onChange={(e) => setF({ ...f, aporte: e.target.value })} /></Campo>
        <Campo label="Corriente (A)"><Input inputMode="decimal" value={f.amperaje} onChange={(e) => setF({ ...f, amperaje: e.target.value })} /></Campo>
        <Campo label="Tensión (V)"><Input inputMode="decimal" value={f.voltaje} onChange={(e) => setF({ ...f, voltaje: e.target.value })} /></Campo>
        <Campo label="Velocidad (mm/min)"><Input inputMode="decimal" value={f.velocidad} onChange={(e) => setF({ ...f, velocidad: e.target.value })} /></Campo>
        <Campo label="Polaridad"><Input value={f.polaridad} onChange={(e) => setF({ ...f, polaridad: e.target.value })} /></Campo>
        <Campo label="Precalent. (°C)"><Input inputMode="decimal" value={f.precal} onChange={(e) => setF({ ...f, precal: e.target.value })} /></Campo>
        <Campo label="Entre pasadas (°C)"><Input inputMode="decimal" value={f.interpasada} onChange={(e) => setF({ ...f, interpasada: e.target.value })} /></Campo>
        <Campo label="Inspector"><Input value={f.inspector} onChange={(e) => setF({ ...f, inspector: e.target.value })} /></Campo>
      </div>
      {resultado && <p className="text-xs text-red-700">{resultado}</p>}
      <ErrorTexto error={error} />
      <Button size="sm" onClick={guardar} disabled={control.isPending}>{control.isPending ? "Guardando..." : "Guardar control"}</Button>
    </div>
  )
}
