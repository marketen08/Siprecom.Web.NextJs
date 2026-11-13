"use client"

import { useMemo, useState } from "react"
import { FileSpreadsheet, FlaskConical, Send } from "lucide-react"

import { personalEnd as apiPersonalEnd } from "@/features/soldadura/api/use-soldadura"
import { descargar, useCrearInforme, useCrearSolicitud, useInformes, usePendientes, useSolicitudes } from "@/features/soldadura/api/use-inspeccion"
import { fechaCorta } from "@/features/soldadura/types"
import {
  METODO_LABEL, METODOS_LOTE, MOTIVO_LABEL, MetodoEnsayo, ResultadoEnsayo, type Ensayo, type ResultadoCarga,
} from "@/features/soldadura/types-inspeccion"
import { BotonArchivo, CLASE_SELECT, Campo, Encabezado, ErrorTexto, FilaVacia, usePermisosSoldadura } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const hoy = () => new Date().toISOString().slice(0, 10)

/**
 * Ensayos de laboratorio: los pendientes (los eligió el muestreo, una ampliación o
 * una reparación), los pedidos al laboratorio (registro 010-04) y los informes que
 * vuelven, con el resultado de cada junta y el PDF.
 */
export default function EnsayosPage() {
  const pendientes = usePendientes()
  const solicitudes = useSolicitudes()
  const informes = useInformes()
  const { padron } = usePermisosSoldadura()
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [pedido, setPedido] = useState(false)
  const [informe, setInforme] = useState(false)
  const [carga, setCarga] = useState<ResultadoCarga | null>(null)

  const lista = pendientes.data ?? []
  const sinPedir = lista.filter((e) => e.solicitudNumero == null)
  const elegidos = lista.filter((e) => seleccion.has(e.id))

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Encabezado
          titulo="Ensayos pendientes"
          descripcion="Lo que falta ensayar: la muestra de cada lote, sus ampliaciones y los reensayos de las juntas reparadas. Elegí los que van en un pedido al laboratorio; cuando vuelve el informe, cargá el resultado de cada junta."
        >
          <Button variant="outline" className="gap-2" disabled={!padron || elegidos.length === 0} onClick={() => setPedido(true)}>
            <Send className="h-4 w-4" /> Pedir al laboratorio{elegidos.length > 0 ? ` (${elegidos.length})` : ""}
          </Button>
          <Button className="gap-2" disabled={!padron || lista.length === 0} onClick={() => setInforme(true)}>
            <FlaskConical className="h-4 w-4" /> Cargar informe
          </Button>
        </Encabezado>

        {carga && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
            Informe cargado: {carga.procesadas} junta{carga.procesadas !== 1 ? "s" : ""}, {carga.rechazadas} rechazada{carga.rechazadas !== 1 ? "s" : ""}
            {carga.noConformidadesCreadas > 0 && <>, {carga.noConformidadesCreadas} no conformidad{carga.noConformidadesCreadas !== 1 ? "es" : ""} abierta{carga.noConformidadesCreadas !== 1 ? "s" : ""}</>}.
            {carga.rechazadas > 0 && <span className="block text-xs mt-1">Las rechazadas quedan para reparar y su lote se amplía: los ensayos nuevos aparecen en esta lista.</span>}
            {carga.avisos.map((a) => <p key={a} className="text-amber-800 text-xs mt-1">{a}</p>)}
          </div>
        )}

        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input type="checkbox" className="h-4 w-4 accent-blue-600" title="Elegir los que no están pedidos"
                    checked={sinPedir.length > 0 && sinPedir.every((e) => seleccion.has(e.id))}
                    onChange={(e) => setSeleccion(e.target.checked ? new Set(sinPedir.map((x) => x.id)) : new Set())} />
                </TableHead>
                <TableHead className="font-semibold text-gray-700">Junta</TableHead>
                <TableHead className="w-20 font-semibold text-gray-700">Método</TableHead>
                <TableHead className="w-32 font-semibold text-gray-700">Motivo</TableHead>
                <TableHead className="w-24 font-semibold text-gray-700">Lote</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientes.isLoading || lista.length === 0 ? (
                <FilaVacia columnas={6} cargando={pendientes.isLoading} vacio="No hay ensayos pendientes." />
              ) : lista.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <input type="checkbox" className="h-4 w-4 accent-blue-600" disabled={e.solicitudNumero != null}
                      checked={seleccion.has(e.id)}
                      onChange={() => setSeleccion((s) => { const n = new Set(s); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n })} />
                  </TableCell>
                  <TableCell className="font-mono">{e.identificacion}{e.ciclo > 0 && <span className="ml-1 font-sans text-xs text-muted-foreground">R{e.ciclo}</span>}</TableCell>
                  <TableCell className="font-mono">{METODO_LABEL[e.metodo]}</TableCell>
                  <TableCell className="text-sm">{MOTIVO_LABEL[e.motivo]}</TableCell>
                  <TableCell className="text-sm">{e.loteNumero ?? "—"}</TableCell>
                  <TableCell className="text-sm">{e.solicitudNumero != null ? `N° ${e.solicitudNumero}` : <span className="text-muted-foreground">Sin pedir</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pedidos al laboratorio</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 font-semibold text-gray-700">N°</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Fecha</TableHead>
                <TableHead className="font-semibold text-gray-700">Laboratorio</TableHead>
                <TableHead className="w-36 font-semibold text-gray-700 text-right">Con resultado</TableHead>
                <TableHead className="w-24 font-semibold text-gray-700 text-right">Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudes.isLoading || (solicitudes.data ?? []).length === 0 ? (
                <FilaVacia columnas={5} cargando={solicitudes.isLoading} vacio="No hay pedidos emitidos." />
              ) : (solicitudes.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-medium">{s.numero}</TableCell>
                  <TableCell className="tabular-nums">{fechaCorta(s.fecha)}</TableCell>
                  <TableCell className="text-sm">{s.laboratorio ?? "—"}{s.solicitadoPor && <span className="block text-xs text-muted-foreground">pidió {s.solicitadoPor}</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.conResultado} / {s.ensayos}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-700" title="Solicitud de END (Excel)" onClick={() => descargar(`solicitudes/${s.id}/registro`)}>
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Informes del laboratorio</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Informe</TableHead>
                <TableHead className="w-20 font-semibold text-gray-700">Método</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Fecha</TableHead>
                <TableHead className="font-semibold text-gray-700">Laboratorio / evaluó</TableHead>
                <TableHead className="w-32 font-semibold text-gray-700 text-right">Juntas</TableHead>
                <TableHead className="w-24 font-semibold text-gray-700 text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {informes.isLoading || (informes.data ?? []).length === 0 ? (
                <FilaVacia columnas={6} cargando={informes.isLoading} vacio="No hay informes cargados." />
              ) : (informes.data ?? []).map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono font-medium">{i.numero}</TableCell>
                  <TableCell className="font-mono">{METODO_LABEL[i.metodo]}</TableCell>
                  <TableCell className="tabular-nums">{fechaCorta(i.fecha)}</TableCell>
                  <TableCell className="text-sm">{i.laboratorio ?? "—"}{i.evaluador && <span className="block text-xs text-muted-foreground">{i.evaluador}</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.juntas}{i.rechazadas > 0 && <span className="block text-xs text-red-700">{i.rechazadas} rechazadas</span>}</TableCell>
                  <TableCell className="text-right"><BotonArchivo tipo="Informe" id={i.id} tieneArchivo={i.tieneArchivo} nombre={i.archivoNombre} puedeSubir={padron} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {pedido && <PedidoSheet ensayos={elegidos} onCerrar={(ok) => { setPedido(false); if (ok) setSeleccion(new Set()) }} />}
      {informe && <InformeSheet pendientes={lista} onCerrar={(r) => { setInforme(false); if (r) setCarga(r) }} />}
    </div>
  )
}

function PedidoSheet({ ensayos, onCerrar }: { ensayos: Ensayo[]; onCerrar: (ok?: boolean) => void }) {
  const crear = useCrearSolicitud()
  const [f, setF] = useState({ fecha: hoy(), laboratorio: "", solicitadoPor: "", observaciones: "" })
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setError(null)
    try {
      await crear.mutateAsync({
        fecha: f.fecha, laboratorio: f.laboratorio.trim() || null, solicitadoPor: f.solicitadoPor.trim() || null,
        observaciones: f.observaciones.trim() || null, ensayoIds: ensayos.map((e) => e.id),
      })
      onCerrar(true)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pedido al laboratorio</SheetTitle>
          <SheetDescription>{ensayos.length} ensayo{ensayos.length !== 1 ? "s" : ""}. Después de emitirlo, bajá el registro para entregárselo al laboratorio.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 space-y-3">
          <Campo label="Fecha"><Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
          <Campo label="Laboratorio"><Input value={f.laboratorio} onChange={(e) => setF({ ...f, laboratorio: e.target.value })} /></Campo>
          <Campo label="Solicitado por"><Input value={f.solicitadoPor} onChange={(e) => setF({ ...f, solicitadoPor: e.target.value })} /></Campo>
          <Campo label="Observaciones"><Input value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} /></Campo>
          <ErrorTexto error={error} />
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={guardar} disabled={crear.isPending}>{crear.isPending ? "Emitiendo..." : "Emitir pedido"}</Button>
            <Button variant="outline" className="flex-1" onClick={() => onCerrar()}>Cancelar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InformeSheet({ pendientes, onCerrar }: { pendientes: Ensayo[]; onCerrar: (r?: ResultadoCarga) => void }) {
  const crear = useCrearInforme()
  const personal = apiPersonalEnd.useList()
  const [f, setF] = useState({ numero: "", metodo: MetodoEnsayo.RT, fecha: hoy(), laboratorio: "", personalEndId: "" })
  const [items, setItems] = useState<Record<string, { incluir: boolean; resultado: ResultadoEnsayo; defecto: string }>>({})
  const [error, setError] = useState<string | null>(null)

  const delMetodo = useMemo(() => pendientes.filter((e) => e.metodo === f.metodo), [pendientes, f.metodo])
  const item = (id: string) => items[id] ?? { incluir: false, resultado: ResultadoEnsayo.Aceptada, defecto: "" }
  const elegidos = delMetodo.filter((e) => item(e.id).incluir)
  const faltaDefecto = elegidos.some((e) => item(e.id).resultado === ResultadoEnsayo.Rechazada && !item(e.id).defecto.trim())

  async function guardar() {
    setError(null)
    try {
      const r = await crear.mutateAsync({
        numero: f.numero.trim(), metodo: f.metodo, fecha: f.fecha, laboratorio: f.laboratorio.trim() || null, personalEndId: f.personalEndId || null,
        items: elegidos.map((e) => ({ ensayoId: e.id, resultado: item(e.id).resultado, defecto: item(e.id).resultado === ResultadoEnsayo.Rechazada ? item(e.id).defecto.trim() : null })),
      })
      onCerrar(r)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cargar informe del laboratorio</SheetTitle>
          <SheetDescription>Marcá las juntas que cubre el informe y el resultado de cada una. El PDF se sube desde la lista de informes.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo label="N° de informe"><Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} className="font-mono" /></Campo>
            <Campo label="Método">
              <select value={f.metodo} onChange={(e) => setF({ ...f, metodo: Number(e.target.value) as MetodoEnsayo })} className={CLASE_SELECT}>
                {METODOS_LOTE.map((m) => <option key={m} value={m}>{METODO_LABEL[m]}</option>)}
              </select>
            </Campo>
            <Campo label="Fecha"><Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
            <Campo label="Laboratorio"><Input value={f.laboratorio} onChange={(e) => setF({ ...f, laboratorio: e.target.value })} /></Campo>
            <Campo label="Evaluó" className="col-span-2">
              <select value={f.personalEndId} onChange={(e) => setF({ ...f, personalEndId: e.target.value })} className={CLASE_SELECT}>
                <option value="">—</option>
                {(personal.data ?? []).filter((p) => p.metodo === METODO_LABEL[f.metodo]).map((p) => <option key={p.id} value={p.id}>{p.nombre} · nivel {p.nivel}</option>)}
              </select>
            </Campo>
          </div>

          {delMetodo.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay ensayos {METODO_LABEL[f.metodo]} pendientes.</p>
          ) : (
            <div className="rounded-md border divide-y">
              {delMetodo.map((e) => {
                const it = item(e.id)
                const set = (c: Partial<typeof it>) => setItems({ ...items, [e.id]: { ...it, ...c } })
                return (
                  <div key={e.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={it.incluir} onChange={(x) => set({ incluir: x.target.checked })} />
                    <span className="font-mono text-sm flex-1 min-w-40">{e.identificacion}{e.ciclo > 0 && <span className="ml-1 font-sans text-xs text-muted-foreground">R{e.ciclo}</span>}
                      <span className="ml-2 font-sans text-xs text-muted-foreground">{MOTIVO_LABEL[e.motivo]}{e.solicitudNumero != null ? ` · pedido ${e.solicitudNumero}` : ""}</span>
                    </span>
                    {it.incluir && (
                      <>
                        <div className="flex rounded-md border overflow-hidden text-xs">
                          {[ResultadoEnsayo.Aceptada, ResultadoEnsayo.Rechazada].map((r) => (
                            <button key={r} type="button"
                              className={`px-2.5 py-1 ${it.resultado === r ? (r === ResultadoEnsayo.Aceptada ? "bg-green-600 text-white" : "bg-red-600 text-white") : "bg-white"}`}
                              onClick={() => set({ resultado: r })}>
                              {r === ResultadoEnsayo.Aceptada ? "Aceptada" : "Rechazada"}
                            </button>
                          ))}
                        </div>
                        {it.resultado === ResultadoEnsayo.Rechazada && (
                          <Input className="h-8 w-48 text-sm" placeholder="Defecto" value={it.defecto} onChange={(x) => set({ defecto: x.target.value })} />
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <ErrorTexto error={error} />
          <div className="flex gap-2 max-w-md">
            <Button className="flex-1" onClick={guardar} disabled={crear.isPending || !f.numero.trim() || elegidos.length === 0 || faltaDefecto}>
              {crear.isPending ? "Guardando..." : `Cargar informe (${elegidos.length})`}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onCerrar()}>Cancelar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
