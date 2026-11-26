"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, Download, FileText, Loader2, Trash2, Upload } from "lucide-react"

import {
  abrirDocumento, descargar, useEjecucion, useEliminarDocumento, usePiesProyecto, useSubirDocumentoSeccion,
} from "@/features/qaqc/api/use-qaqc"
import { CLASE_SELECT, Encabezado, nombreHoja, tamanio, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import type { PieDetalle, PieSeccion } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"

/**
 * Databook de calidad: uno por PIE, armado por las secciones de su índice. Cada sección
 * arranca con su separador; las que llevan el PIE lo traen firmado; después van los
 * registros firmados de sus puntos (con adjuntos) y los documentos sueltos que se cargan
 * acá (ingeniería, procedimientos, certificados de materiales…).
 */
export default function DatabookQaqcPage() {
  const pies = usePiesProyecto()
  const [pieId, setPieId] = useState<string | null>(null)
  useEffect(() => { if (!pieId && pies.data?.length) setPieId(pies.data[0].id) }, [pies.data, pieId])
  const { data: pie } = useEjecucion(pieId)
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState<string | null>(null)

  async function bajar(ruta: string, nombre: string, clave: string) {
    setError(null)
    setGenerando(clave)
    try { await descargar(ruta, nombre) } catch (e) { setError((e as Error).message) } finally { setGenerando(null) }
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Databook de calidad"
        descripcion="Uno por PIE, con el índice que define la plantilla. Los registros entran firmados; los puntos No aplica quedan afuera."
      >
        <select className={`${CLASE_SELECT} w-72`} value={pieId ?? ""} onChange={(e) => setPieId(e.target.value)}>
          {(pies.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.disciplina ?? p.nombre}</option>)}
        </select>
      </Encabezado>

      {pies.data?.length === 0 && <p className="text-sm text-muted-foreground">El proyecto no tiene PIE.</p>}

      {pie && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
            <div>
              <div className="text-sm text-muted-foreground">Código del databook</div>
              <div className="text-lg font-semibold">{pie.codigoDatabook ?? <span className="text-muted-foreground">sin código (se usa el del PIE)</span>}</div>
              <div className="text-xs text-muted-foreground">{pie.puntosFirmados} de {pie.totalPuntos - pie.puntosNoAplica} puntos firmados · {pie.cerrado ? "PIE cerrado" : "PIE en curso: el databook sale con lo firmado hasta hoy"}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={generando !== null} onClick={() => bajar(`proyecto/pies/${pie.id}/pdf`, `${pie.codigo}.pdf`, "pie")}>
                {generando === "pie" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PIE firmado
              </Button>
              <Button disabled={generando !== null} onClick={() => bajar(`proyecto/pies/${pie.id}/databook`, `Databook ${pie.codigoDatabook ?? pie.codigo}.pdf`, "db")}>
                {generando === "db" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />} {generando === "db" ? "Armando..." : "Generar databook"}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}

          <div className="space-y-3">
            {(pie.secciones.length ? pie.secciones : []).map((s) => <Seccion key={s.id} pie={pie} seccion={s} />)}
            {pie.secciones.length === 0 && (
              <p className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">El PIE no tiene índice de databook: sale con dos secciones, el PIE firmado y los registros. El índice se arma en la estructura del PIE.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Seccion({ pie, seccion }: { pie: PieDetalle; seccion: PieSeccion }) {
  const { carga } = usePermisosQaqc()
  const subir = useSubirDocumentoSeccion()
  const eliminar = useEliminarDocumento()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  // Qué registros caen acá: los puntos con esta sección, los de su hoja (si es de hoja) o,
  // en la última sección, los que no tienen dónde ir.
  const ultima = pie.secciones[pie.secciones.length - 1]?.id === seccion.id
  const puntos = pie.hojasDetalle.flatMap((h) => h.etapas.flatMap((e) => e.puntos.map((p) => ({ p, hojaId: h.id }))))
    .filter(({ p, hojaId }) => !p.noAplica && (
      p.seccionId === seccion.id
      || (!p.seccionId && seccion.hojaId === hojaId)
      || (!p.seccionId && ultima && !pie.secciones.some((s) => s.hojaId === hojaId))))
  const registros = puntos.reduce((a, { p }) => a + p.registros.filter((r) => r.cerrado).length, 0)
  const hoja = seccion.hojaId ? pie.hojasDetalle.find((h) => h.id === seccion.hojaId) : null

  async function cargar(archivo: File | undefined) {
    if (!archivo) return
    setError(null)
    try { await subir.mutateAsync({ seccionId: seccion.id, archivo }) }
    catch (e) { setError((e as Error).message) }
    finally { if (input.current) input.current.value = "" }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-blue-700">Sección Nº {seccion.numero}</div>
          <div className="font-semibold">{seccion.nombre}</div>
          <div className="text-xs text-muted-foreground">
            {seccion.incluyePlan && <>Arranca con el PIE firmado{hoja ? ` (${nombreHoja(hoja)})` : ""} · </>}
            {registros} registro(s) firmado(s) de {puntos.length} punto(s) · {seccion.documentos.length} documento(s) suelto(s)
          </div>
        </div>
        {carga && (
          <>
            <input ref={input} type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => cargar(e.target.files?.[0])} />
            <Button size="sm" variant="outline" disabled={subir.isPending} onClick={() => input.current?.click()}>
              {subir.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Cargar documento
            </Button>
          </>
        )}
      </div>
      {seccion.documentos.length > 0 && (
        <ul className="mt-3 divide-y rounded-md border">
          {seccion.documentos.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
              <button className="flex min-w-0 items-center gap-2 text-left hover:underline" onClick={() => abrirDocumento(d.id).catch((e) => setError(e.message))}>
                <FileText className="h-4 w-4 shrink-0 text-slate-500" /><span className="truncate">{d.nombre}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{tamanio(d.tamanioBytes)}</span>
              </button>
              {carga && <Button size="icon-xs" variant="ghost" onClick={() => eliminar.mutateAsync(d.id).catch((e) => setError(e.message))}><Trash2 /></Button>}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
