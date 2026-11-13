"use client"

import { useState } from "react"
import { FileSpreadsheet, Layers } from "lucide-react"

import { soldadores as apiSoldadores } from "@/features/soldadura/api/use-soldadura"
import { lineas as apiLineas } from "@/features/soldadura/api/use-juntas"
import { descargar, useArmarLotes, useLote, useLotes } from "@/features/soldadura/api/use-inspeccion"
import { fechaCorta } from "@/features/soldadura/types"
import { ESTADO_JUNTA } from "@/features/soldadura/types-juntas"
import {
  ESTADO_LOTE, METODO_LABEL, METODOS_LOTE, MetodoEnsayo, ResultadoEnsayo, SELECCION_LABEL, SeleccionLote,
} from "@/features/soldadura/types-inspeccion"
import { CLASE_SELECT, Campo, Encabezado, ErrorTexto, FilaVacia, usePermisosSoldadura } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Lotes de soldadura por soldador (registro 010-06). Se arman con las juntas que
 * tienen la visual aprobada; el sistema elige la muestra según el porcentaje de la
 * clase y, ante un rechazo, amplía con juntas del mismo soldador según la norma (ASME
 * B31.3: dos por rechazo, dos rondas, después el lote completo).
 */
export default function LotesPage() {
  const lotes = useLotes()
  const soldadores = apiSoldadores.useList()
  const lineas = apiLineas.useList()
  const armar = useArmarLotes()
  const { parametros } = usePermisosSoldadura()
  const [f, setF] = useState({ metodo: MetodoEnsayo.RT, soldadorProyectoId: "", lineaId: "" })
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<string | null>(null)

  async function armarLotes() {
    setError(null)
    setMensaje(null)
    try {
      const r = await armar.mutateAsync({ metodo: f.metodo, soldadorProyectoId: f.soldadorProyectoId || null, lineaId: f.lineaId || null })
      setMensaje(r.message)
    } catch (e) { setError((e as Error).message) }
  }

  const lista = lotes.data ?? []

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Lotes de soldadura"
        descripcion="Un lote por soldador y clase, con las juntas de visual aprobada. La muestra la elige el sistema según el porcentaje de la clase; un rechazo agrega juntas del mismo soldador según la norma, y el lote se libera cuando no quedan rechazos sin reparar y reensayar."
      />

      {parametros && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><Layers className="h-4 w-4" /> Armar lotes con las juntas listas</p>
          <div className="flex flex-wrap items-end gap-3">
            <Campo label="Método" className="w-28">
              <select value={f.metodo} onChange={(e) => setF({ ...f, metodo: Number(e.target.value) as MetodoEnsayo })} className={CLASE_SELECT}>
                {METODOS_LOTE.map((m) => <option key={m} value={m}>{METODO_LABEL[m]}</option>)}
              </select>
            </Campo>
            <Campo label="Soldador" className="w-56">
              <select value={f.soldadorProyectoId} onChange={(e) => setF({ ...f, soldadorProyectoId: e.target.value })} className={CLASE_SELECT}>
                <option value="">Todos</option>
                {(soldadores.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.cuno} — {s.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Línea" className="w-56">
              <select value={f.lineaId} onChange={(e) => setF({ ...f, lineaId: e.target.value })} className={CLASE_SELECT}>
                <option value="">Todas</option>
                {(lineas.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}
              </select>
            </Campo>
            <Button onClick={armarLotes} disabled={armar.isPending}>{armar.isPending ? "Armando..." : "Armar lotes"}</Button>
          </div>
          {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
          <ErrorTexto error={error} />
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 font-semibold text-gray-700">Lote</TableHead>
              <TableHead className="font-semibold text-gray-700">Soldador</TableHead>
              <TableHead className="w-24 font-semibold text-gray-700">Clase</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Método</TableHead>
              <TableHead className="w-36 font-semibold text-gray-700 text-right">Elegidas / juntas</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Rechazos</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700">Estado</TableHead>
              <TableHead className="w-24 font-semibold text-gray-700 text-right">Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotes.isLoading || lista.length === 0 ? (
              <FilaVacia columnas={8} cargando={lotes.isLoading} vacio="No hay lotes armados." />
            ) : lista.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetalle(l.id)}>
                <TableCell className="font-mono font-medium">{l.numero}</TableCell>
                <TableCell><span className="font-mono">{l.cuno}</span> <span className="text-sm text-muted-foreground">{l.soldador}</span></TableCell>
                <TableCell className="font-mono text-sm">{l.claseCodigo}</TableCell>
                <TableCell className="text-sm">{METODO_LABEL[l.metodo]} {l.porcentaje}%</TableCell>
                <TableCell className="text-right tabular-nums">{l.elegidas} / {l.juntas}{l.pendientes > 0 && <span className="block text-xs text-amber-700">{l.pendientes} pendientes</span>}</TableCell>
                <TableCell className={`text-right tabular-nums ${l.rechazos > 0 ? "text-red-700" : ""}`}>{l.rechazos}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_LOTE[l.estado].clase}`}>{ESTADO_LOTE[l.estado].label}</span>
                  {l.ronda > 0 && <span className="block text-xs text-muted-foreground">ronda {l.ronda}</span>}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-700" title="Liberación de lote (Excel)" onClick={() => descargar(`lotes/${l.id}/registro`)}>
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {detalle && <DetalleLote id={detalle} onCerrar={() => setDetalle(null)} />}
    </div>
  )
}

function DetalleLote({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const { data: l } = useLote(id)
  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lote {l?.numero} · {l?.cuno}</SheetTitle>
          <SheetDescription>{l ? `${METODO_LABEL[l.metodo]} ${l.porcentaje}% · clase ${l.claseCodigo} · ${ESTADO_LOTE[l.estado].label}${l.ronda > 0 ? `, ronda ${l.ronda}` : ""}` : "Cargando..."}</SheetDescription>
        </SheetHeader>
        {l?.detalle && (
          <div className="mt-4 px-4 pb-6">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left"><th className="py-1 font-medium">Junta</th><th className="py-1 font-medium">Elegida</th><th className="py-1 font-medium">Ensayo</th><th className="py-1 font-medium">Informe</th><th className="py-1 font-medium">Estado de la junta</th></tr>
              </thead>
              <tbody>
                {l.detalle.map((j) => (
                  <tr key={j.juntaId} className="border-t">
                    <td className="py-1.5 font-mono">{j.identificacion}</td>
                    <td className="py-1.5">{SELECCION_LABEL[j.seleccion]}{j.seleccion !== SeleccionLote.NoSeleccionada && j.ronda > 0 ? ` (ronda ${j.ronda})` : ""}</td>
                    <td className={`py-1.5 ${j.resultado === ResultadoEnsayo.Rechazada ? "text-red-700" : j.resultado === ResultadoEnsayo.Aceptada ? "text-green-700" : "text-amber-700"}`}>
                      {j.resultado == null ? "—" : j.resultado === ResultadoEnsayo.Pendiente ? "Pendiente" : j.resultado === ResultadoEnsayo.Aceptada ? "Aceptada" : "Rechazada"}
                      {j.fecha && <span className="ml-1 text-xs text-muted-foreground">{fechaCorta(j.fecha)}</span>}
                    </td>
                    <td className="py-1.5">{j.informe ?? "—"}</td>
                    <td className="py-1.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_JUNTA[j.estadoJunta].clase}`}>{ESTADO_JUNTA[j.estadoJunta].label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
