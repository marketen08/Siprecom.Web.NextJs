"use client"

import { useState } from "react"

import { useVisual } from "@/features/soldadura/api/use-inspeccion"
import { ResultadoEnsayo, type ResultadoCarga } from "@/features/soldadura/types-inspeccion"
import type { Junta } from "@/features/soldadura/types-juntas"
import { Campo, ErrorTexto } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

/**
 * Inspección visual de varias juntas de una vez, como el registro 010-11: todas
 * aprobadas por defecto, y las rechazadas con su defecto. Volver a cargar la visual de
 * una junta en el mismo ciclo corrige la anterior.
 */
export function VisualDialog({ juntas, onCerrar }: { juntas: Junta[]; onCerrar: (resultado?: ResultadoCarga) => void }) {
  const visual = useVisual()
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [inspector, setInspector] = useState("")
  const [items, setItems] = useState(juntas.map((j) => ({ juntaId: j.id, identificacion: j.identificacion, resultado: ResultadoEnsayo.Aceptada, defecto: "" })))
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setError(null)
    try {
      const r = await visual.mutateAsync({
        fecha, inspector: inspector.trim() || null,
        items: items.map((i) => ({ juntaId: i.juntaId, resultado: i.resultado, defecto: i.resultado === ResultadoEnsayo.Rechazada ? i.defecto.trim() : null })),
      })
      onCerrar(r)
    } catch (e) { setError((e as Error).message) }
  }

  const faltaDefecto = items.some((i) => i.resultado === ResultadoEnsayo.Rechazada && !i.defecto.trim())

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Inspección visual · {juntas.length} junta{juntas.length !== 1 ? "s" : ""}</SheetTitle>
          <SheetDescription>Marcá las rechazadas con su defecto. Una junta rechazada queda para reparar.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Fecha"><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
            <Campo label="Inspector"><Input value={inspector} onChange={(e) => setInspector(e.target.value)} /></Campo>
          </div>
          <div className="rounded-md border divide-y">
            {items.map((i, k) => (
              <div key={i.juntaId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="font-mono text-sm flex-1 min-w-40">{i.identificacion}</span>
                <div className="flex rounded-md border overflow-hidden text-xs">
                  {[ResultadoEnsayo.Aceptada, ResultadoEnsayo.Rechazada].map((r) => (
                    <button key={r} type="button"
                      className={`px-2.5 py-1 ${i.resultado === r ? (r === ResultadoEnsayo.Aceptada ? "bg-green-600 text-white" : "bg-red-600 text-white") : "bg-white"}`}
                      onClick={() => setItems(items.map((x, j) => (j === k ? { ...x, resultado: r } : x)))}>
                      {r === ResultadoEnsayo.Aceptada ? "AP" : "R"}
                    </button>
                  ))}
                </div>
                {i.resultado === ResultadoEnsayo.Rechazada && (
                  <Input className="h-8 w-56 text-sm" placeholder="Defecto (obligatorio)" value={i.defecto}
                    onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, defecto: e.target.value } : x)))} />
                )}
              </div>
            ))}
          </div>
          <ErrorTexto error={error} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={guardar} disabled={visual.isPending || faltaDefecto}>{visual.isPending ? "Guardando..." : "Guardar inspección"}</Button>
            <Button variant="outline" className="flex-1" onClick={() => onCerrar()}>Cancelar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
