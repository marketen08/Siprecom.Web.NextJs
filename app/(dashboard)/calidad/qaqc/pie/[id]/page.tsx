"use client"

import { Fragment, use, useMemo, useState } from "react"
import Link from "next/link"
import { Boxes, BookOpen, CheckCircle2, ChevronRight, Download, FileText, Lock, PenLine, Settings2 } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { descargar, useEjecucion, useFirmarHoja, useFirmarPunto } from "@/features/qaqc/api/use-qaqc"
import {
  BarraAvance, EstadoPuntoBadge, fecha, nombreHoja, TipoBadge, usePermisosQaqc,
} from "@/features/qaqc/components/comunes"
import { DialogoTexto } from "@/features/qaqc/components/dialogo-texto"
import { PuntoSheet } from "@/features/qaqc/components/punto-sheet"
import { AlcanceImportSheet } from "@/features/qaqc/components/alcance-import"
import { AlcancePunto, EstadoPunto, nombreItems, type PieHoja, type PiePunto } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"

type Firma = { tipo: "punto"; punto: PiePunto; parteId: string } | { tipo: "hoja"; hoja: PieHoja; parteId: string }

/**
 * El PIE en obra, con la misma forma que el documento en papel: una tabla por hoja,
 * etapas como separadores y, por cada parte, su tipo de punto y su firma. Al pie de cada
 * hoja, las firmas finales.
 */
export default function PiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: pie, isLoading, error } = useEjecucion(id)
  const { gestion, carga } = usePermisosQaqc()
  const [importarAlcance, setImportarAlcance] = useState(false)
  const firmarPunto = useFirmarPunto()
  const firmarHoja = useFirmarHoja()
  const [hojaSel, setHojaSel] = useState<string | null>(null)
  const [puntoSel, setPuntoSel] = useState<string | null>(null)
  const [firma, setFirma] = useState<Firma | null>(null)
  const [errorFirma, setErrorFirma] = useState<string | null>(null)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)
  const [descargando, setDescargando] = useState<string | null>(null)

  useBreadcrumb(pie ? [
    { label: "Calidad" },
    { label: "Avance por PIE", href: "/calidad/qaqc" },
    { label: pie.disciplina ?? pie.codigo },
  ] : null)

  const hoja = useMemo(() => pie?.hojasDetalle.find((h) => h.id === hojaSel) ?? pie?.hojasDetalle[0], [pie, hojaSel])
  const punto = useMemo(() => pie?.hojasDetalle.flatMap((h) => h.etapas.flatMap((e) => e.puntos)).find((p) => p.id === puntoSel) ?? null, [pie, puntoSel])

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>
  if (error) return <p className="text-sm text-red-600">{(error as Error).message}</p>
  if (!pie || !hoja) return null

  const misPartes = pie.partes.filter((p) => pie.misPartes.includes(p.id))

  async function bajar(ruta: string, nombre: string, clave: string) {
    setErrorDescarga(null)
    setDescargando(clave)
    try { await descargar(ruta, nombre) } catch (e) { setErrorDescarga((e as Error).message) } finally { setDescargando(null) }
  }

  async function confirmarFirma(comentario: string) {
    if (!firma) return
    setErrorFirma(null)
    try {
      if (firma.tipo === "punto") await firmarPunto.mutateAsync({ puntoId: firma.punto.id, parteId: firma.parteId, comentario: comentario || undefined })
      else await firmarHoja.mutateAsync({ hojaId: firma.hoja.id, parteId: firma.parteId, comentario: comentario || undefined })
      setFirma(null)
    } catch (e) { setErrorFirma((e as Error).message) }
  }

  const parteDeFirma = firma ? pie.partes.find((p) => p.id === firma.parteId) : null
  const columnas = 4 + pie.partes.length

  return (
    <div className="space-y-4">
      {/* ── Encabezado del documento ───────────────────────────── */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan de Inspección y Ensayos</p>
            <h1 className="text-2xl font-semibold">{pie.disciplina ?? pie.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              {pie.codigo} · Rev. {pie.revision ?? "0"}
              {pie.obra && <> · Obra {pie.obra}</>}
              {pie.area && <> · {pie.area}</>}
              {pie.plantillaRevision && <> · plantilla rev. {pie.plantillaRevision}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={descargando !== null} onClick={() => bajar(`proyecto/pies/${pie.id}/pdf`, `${pie.codigo}.pdf`, "pdf")}>
              <Download className="h-4 w-4" /> {descargando === "pdf" ? "Generando..." : "PIE en PDF"}
            </Button>
            <Button variant="outline" disabled={descargando !== null} onClick={() => bajar(`proyecto/pies/${pie.id}/databook`, `Databook ${pie.codigo}.pdf`, "db")}>
              <BookOpen className="h-4 w-4" /> {descargando === "db" ? "Armando databook..." : "Databook"}
            </Button>
            {pie.tieneAlcance && carga && (
              <Button variant="outline" onClick={() => setImportarAlcance(true)}><Boxes className="h-4 w-4" /> Alcance</Button>
            )}
            {gestion && (
              <Button variant="outline" asChild><Link href={`/calidad/qaqc/configuracion/${pie.id}`}><Settings2 className="h-4 w-4" /> Estructura</Link></Button>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <BarraAvance porcentaje={pie.porcentaje} alto="h-3" />
            {pie.tieneAlcance && pie.unidades && (
              <p className="mt-1 text-xs">
                <strong>{pie.unidades.hechas} de {pie.unidades.total - pie.unidades.noAplica}</strong> controles hechos
                <span className="text-muted-foreground"> (cada elemento de los puntos por elemento cuenta uno)</span>
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {pie.puntosFirmados} de {pie.totalPuntos - pie.puntosNoAplica} puntos firmados
              {pie.tieneAlcance && <> ({pie.porcentajePuntos.toLocaleString("es-AR", { maximumFractionDigits: 1 })}% por puntos)</>}
              {pie.puntosNoAplica > 0 && <> · {pie.puntosNoAplica} no aplican</>}
              {pie.cerrado && <span className="ml-1 font-medium text-green-700">· PIE cerrado</span>}
            </p>
          </div>
          <div className="text-sm">
            {misPartes.length > 0
              ? <p><span className="text-muted-foreground">Firmás como:</span> <strong>{misPartes.map((p) => p.nombre).join(" y ")}</strong></p>
              : <p className="text-muted-foreground">No tenés en el proyecto el rol de firma de ninguna parte: podés cargar registros y documentos, no firmar.</p>}
            <p className="mt-1 text-xs text-muted-foreground">Un punto se firma con sus registros firmados; un RD pide el documento revisado; un HP sin firmar bloquea el punto siguiente.</p>
          </div>
        </div>
        {errorDescarga && <p className="mt-2 text-sm text-red-600">{errorDescarga}</p>}
      </div>

      {/* ── Hojas ──────────────────────────────────────────────── */}
      {pie.hojasDetalle.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b">
          {pie.hojasDetalle.map((h) => (
            <button
              key={h.id}
              onClick={() => setHojaSel(h.id)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${h.id === hoja.id ? "border-blue-600 font-medium text-blue-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {h.numero && <span className="mr-1 text-xs tabular-nums">Nº {h.numero}</span>}{h.nombre}
              <span className="ml-2 text-xs tabular-nums">{Math.round(h.porcentaje)}%</span>
              {h.cerrada && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-green-600" />}
            </button>
          ))}
        </div>
      )}

      {/* ── Grilla ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50 text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="w-14 px-3 py-2 text-left font-medium">Nº</th>
              <th className="px-3 py-2 text-left font-medium">Actividad</th>
              {pie.partes.map((p) => <th key={p.id} className="w-48 px-3 py-2 text-left font-medium">{p.nombre}</th>)}
              <th className="w-32 px-3 py-2 text-left font-medium">Registros</th>
              <th className="w-40 px-3 py-2 text-left font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {hoja.etapas.map((e) => (
              <Fragment key={e.id}>
                <tr className="border-b bg-slate-100/70">
                  <td className="px-3 py-1.5 font-semibold">{e.numero}</td>
                  <td colSpan={columnas - 1} className="px-3 py-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{e.nombre}</span>
                      <span className="w-48"><BarraAvance porcentaje={e.porcentaje} alto="h-1.5" /></span>
                    </div>
                  </td>
                </tr>
                {e.puntos.map((p) => (
                  <tr key={p.id} className={`border-b align-top hover:bg-blue-50/40 ${p.noAplica ? "text-muted-foreground" : ""}`}>
                    <td className="px-3 py-2 tabular-nums">{p.numero}</td>
                    <td className="px-3 py-2">
                      <button className="text-left font-medium hover:underline" onClick={() => setPuntoSel(p.id)}>{p.actividad}</button>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {(p.procedimientoCodigo ?? p.documentosAplicables) && <span>{p.procedimientoCodigo ?? p.documentosAplicables}</span>}
                        {p.tipoInforme && <span>Informe: {p.tipoInforme}</span>}
                        {p.frecuencia && <span>{p.frecuencia}</span>}
                      </div>
                      {p.alcance !== AlcancePunto.Unico && (
                        <button onClick={() => setPuntoSel(p.id)}
                          className="mt-1 inline-flex items-center gap-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-100">
                          <Boxes className="h-3 w-3" />
                          {p.itemsTotal === 0
                            ? `Falta cargar los ${nombreItems(p.alcance, 2)}`
                            : `${p.itemsCubiertos}/${p.itemsTotal - p.itemsNoAplica} ${nombreItems(p.alcance, p.itemsTotal - p.itemsNoAplica)}`}
                          {p.itemsLiberadosHp != null && p.itemsTotal > 0 && <span className="text-violet-600">· {p.itemsLiberadosHp} liberados</span>}
                        </button>
                      )}
                    </td>
                    {pie.partes.map((parte) => {
                      const iv = p.intervenciones.find((i) => i.parteId === parte.id)
                      const interviene = !!iv || p.intervenciones.length === 0
                      const f = p.firmas.filter((x) => x.parteId === parte.id && x.vigente).at(-1)
                      const previa = !f && p.firmas.some((x) => x.parteId === parte.id)
                      const puede = pie.misPartes.includes(parte.id) && !hoja.cerrada && interviene && !f && !p.motivo && !p.bloqueadoPor
                        && (p.estadoEjecucion === EstadoPunto.ListoParaFirmar || p.estadoEjecucion === EstadoPunto.AmpliacionPendiente)
                      return (
                        <td key={parte.id} className="px-3 py-2">
                          <div className="flex items-start gap-2">
                            <TipoBadge tipo={iv?.tipo} />
                            {p.noAplica ? <span className="text-xs">N/A</span>
                              : f ? <span className="text-xs text-green-700"><CheckCircle2 className="mr-0.5 inline h-3.5 w-3.5" />{f.usuarioNombre}<br /><span className="text-muted-foreground">{fecha(f.fechaFirma)}</span></span>
                              : !interviene ? null
                              : puede ? <Button size="xs" onClick={() => { setErrorFirma(null); setFirma({ tipo: "punto", punto: p, parteId: parte.id }) }}><PenLine className="h-3 w-3" /> {previa ? "Volver a firmar" : "Firmar"}</Button>
                              : previa ? <span className="text-xs text-violet-700">Falta volver a firmar</span>
                              : <span className="text-xs text-muted-foreground">Sin firmar</span>}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-xs">
                      {p.registros.length > 0 ? (
                        <button className="inline-flex items-center gap-1 hover:underline" onClick={() => setPuntoSel(p.id)}>
                          <FileText className="h-3.5 w-3.5" />
                          {p.registros.filter((r) => r.cerrado).length}/{p.registros.length} firmados
                        </button>
                      ) : p.planillas.length > 0 ? <span className="text-amber-700">Falta el registro</span>
                        : <span className="text-muted-foreground">—</span>}
                      {p.documentos.length > 0 && <div className="text-muted-foreground">{p.documentos.length} documento(s)</div>}
                    </td>
                    <td className="px-3 py-2">
                      <button className="flex w-full items-center justify-between gap-1 text-left" onClick={() => setPuntoSel(p.id)} title={p.motivo ?? undefined}>
                        <EstadoPuntoBadge estado={p.estadoEjecucion} bloqueado={!!p.bloqueadoPor} />
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Firmas finales de la hoja ──────────────────────────── */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Firmas finales · {nombreHoja(hoja)}</h2>
          {hoja.motivoFirmaFinal && !hoja.cerrada && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />{hoja.motivoFirmaFinal}</span>}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {pie.partes.map((parte) => {
            const f = hoja.firmasFinales.find((x) => x.parteId === parte.id)
            const puede = pie.misPartes.includes(parte.id) && !f && !hoja.motivoFirmaFinal
            return (
              <div key={parte.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{parte.nombre}</div>
                  {f ? <div className="text-xs text-green-700">{f.usuarioNombre} · {fecha(f.fechaFirma)}</div>
                    : <div className="text-xs text-muted-foreground">Firma y fecha</div>}
                </div>
                {puede && <Button size="sm" onClick={() => { setErrorFirma(null); setFirma({ tipo: "hoja", hoja, parteId: parte.id }) }}><PenLine className="h-3.5 w-3.5" /> Firmar cierre</Button>}
              </div>
            )
          })}
        </div>
      </div>

      {importarAlcance && <AlcanceImportSheet pieId={pie.id} pieCodigo={pie.codigo} onCerrar={() => setImportarAlcance(false)} />}

      <PuntoSheet pie={pie} punto={punto} onCerrar={() => setPuntoSel(null)} onFirmar={(p, parteId) => { setErrorFirma(null); setFirma({ tipo: "punto", punto: p, parteId }) }} />

      <DialogoTexto
        abierto={firma !== null}
        titulo={firma?.tipo === "punto" ? `Firmar el punto ${firma.punto.numero}` : `Firmar el cierre de ${firma?.tipo === "hoja" ? nombreHoja(firma.hoja) : ""}`}
        descripcion={<>Firmás como <strong>{parteDeFirma?.nombre}</strong> (rol “{parteDeFirma?.rolFirma}”). La firma queda en el PIE con tu nombre y la fecha.</>}
        etiqueta="Comentario"
        accion="Firmar"
        pendiente={firmarPunto.isPending || firmarHoja.isPending}
        error={errorFirma}
        onCancelar={() => setFirma(null)}
        onConfirmar={confirmarFirma}
      />
    </div>
  )
}
