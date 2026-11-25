"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, FileText, Loader2, MinusCircle, PenLine, Plus, Trash2, Undo2, Upload, XCircle } from "lucide-react"

import {
  abrirDocumento, useAnularFirma, useCrearRegistro, useEliminarDocumento, useNoAplica, useQuitarNoAplica, useSubirDocumentoPunto,
} from "@/features/qaqc/api/use-qaqc"
import { EstadoPuntoBadge, fecha, fechaHora, TipoBadge, tamanio, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import { DialogoTexto } from "@/features/qaqc/components/dialogo-texto"
import { AlcancePuntoSeccion } from "@/features/qaqc/components/alcance-punto"
import {
  AlcancePunto, ESTADO_REGISTRO_LABEL, EstadoPunto, TipoPunto, type PieDetalle, type PieFirma, type PiePunto,
} from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

/**
 * Detalle de un punto del PIE en obra: qué se controla, sus registros (con las planillas
 * del punto), los documentos revisados (RD), las firmas de cada parte y el N/A.
 *
 * Los registros se completan y se firman en la pantalla de registros de siempre; el punto
 * se firma acá (o desde la grilla) cuando sus registros ya están firmados.
 */
export function PuntoSheet({
  pie, punto, onCerrar, onFirmar,
}: {
  pie: PieDetalle
  punto: PiePunto | null
  onCerrar: () => void
  onFirmar: (punto: PiePunto, parteId: string) => void
}) {
  const router = useRouter()
  const { gestion, carga, catalogo } = usePermisosQaqc()
  const crearRegistro = useCrearRegistro()
  const subir = useSubirDocumentoPunto()
  const eliminarDoc = useEliminarDocumento()
  const noAplica = useNoAplica()
  const quitarNa = useQuitarNoAplica()
  const anular = useAnularFirma()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<null | { tipo: "na" } | { tipo: "anular"; firma: PieFirma }>(null)
  const [errorDialogo, setErrorDialogo] = useState<string | null>(null)

  if (!punto) return null
  const hojaCerrada = pie.hojasDetalle.find((h) => h.etapas.some((e) => e.puntos.some((p) => p.id === punto.id)))?.cerrada ?? false
  const intervienen = punto.intervenciones.length > 0
    ? punto.intervenciones
    : pie.partes.map((p) => ({ parteId: p.id, tipo: null as TipoPunto | null }))
  const tieneRd = punto.intervenciones.some((i) => i.tipo === TipoPunto.RD)
  const cerrado = punto.estadoEjecucion === EstadoPunto.Firmado || punto.noAplica || hojaCerrada
  const porItems = punto.alcance !== AlcancePunto.Unico
  // El alcance se puede ampliar aunque el punto esté firmado (queda "con ampliación pendiente").
  const alcanceCerrado = punto.noAplica || hojaCerrada
  const puedeFirmar = !punto.motivo && !punto.bloqueadoPor
    && (punto.estadoEjecucion === EstadoPunto.ListoParaFirmar || punto.estadoEjecucion === EstadoPunto.AmpliacionPendiente)
  const etiquetaItem = Object.fromEntries(punto.items.map((i) => [i.id, i.etiqueta ?? "?"]))

  async function nuevoRegistro(planillaId: string) {
    setError(null)
    try {
      const r = await crearRegistro.mutateAsync({ puntoId: punto!.id, planillaId })
      router.push(`/ejecucion/registros/${r.data.registroId}`)
    } catch (e) { setError((e as Error).message) }
  }

  async function subirDocumento(archivo: File | undefined) {
    if (!archivo) return
    setError(null)
    try { await subir.mutateAsync({ puntoId: punto!.id, archivo }) }
    catch (e) { setError((e as Error).message) }
    finally { if (input.current) input.current.value = "" }
  }

  async function confirmarDialogo(texto: string) {
    setErrorDialogo(null)
    try {
      if (dialogo?.tipo === "na") await noAplica.mutateAsync({ puntoId: punto!.id, motivo: texto })
      else if (dialogo?.tipo === "anular") await anular.mutateAsync({ id: dialogo.firma.id, motivo: texto })
      setDialogo(null)
    } catch (e) { setErrorDialogo((e as Error).message) }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Punto {punto.numero} · {punto.actividad}</SheetTitle>
          <SheetDescription>{pie.codigo} · {pie.disciplina ?? pie.nombre}</SheetDescription>
          <div className="pt-1"><EstadoPuntoBadge estado={punto.estadoEjecucion} bloqueado={!!punto.bloqueadoPor} /></div>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          {punto.motivo && !cerrado && (
            <p className={`rounded-md border p-2 text-sm ${punto.bloqueadoPor ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{punto.motivo}</p>
          )}
          {punto.noAplica && (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm"><strong>No aplica:</strong> {punto.noAplicaMotivo}</p>
          )}

          <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Documentos</dt><dd>{punto.documentosAplicables ?? "—"}</dd>
            {punto.procedimientoCodigo && (<><dt className="text-muted-foreground">Procedimiento</dt><dd>{punto.procedimientoCodigo} · {punto.procedimientoNombre}</dd></>)}
            <dt className="text-muted-foreground">Tipo de informe</dt><dd>{punto.tipoInforme ?? "—"}</dd>
            <dt className="text-muted-foreground">Frecuencia</dt><dd>{punto.frecuencia ?? "—"}</dd>
            <dt className="text-muted-foreground">Criterio</dt><dd>{punto.criterioAceptacion ?? "—"}</dd>
            {punto.observaciones && (<><dt className="text-muted-foreground">Observaciones</dt><dd>{punto.observaciones}</dd></>)}
          </dl>

          {porItems && <AlcancePuntoSeccion punto={punto} cerrado={alcanceCerrado} />}

          {/* ── Registros ─────────────────────────────────────────── */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Registros</h3>
            {punto.planillas.length === 0 && punto.registros.length === 0 && (
              <p className="text-sm text-muted-foreground">Este punto no tiene planillas asignadas: se firma sin registro.</p>
            )}
            {punto.registros.length > 0 && (
              <ul className="divide-y rounded-md border">
                {punto.registros.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.planillaCodigo} · {r.planillaNombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {ESTADO_REGISTRO_LABEL[r.estado] ?? r.estado}{r.esFisico ? " · en papel" : ""} · {fechaHora(r.fechaTerminado ?? r.createdAt)}
                      </div>
                      {r.itemIds.length > 0 && (
                        <div className="truncate text-xs text-muted-foreground" title={r.itemIds.map((id) => etiquetaItem[id]).join(", ")}>
                          Cubre: {r.itemIds.slice(0, 6).map((id) => etiquetaItem[id]).join(", ")}{r.itemIds.length > 6 ? ` y ${r.itemIds.length - 6} más` : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-xs font-medium ${r.cerrado ? "text-green-700" : "text-amber-700"}`}>{r.cerrado ? "Respalda el punto" : "Falta firmar"}</span>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/ejecucion/registros/${r.id}`)}><ExternalLink className="h-3.5 w-3.5" /> Abrir</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {porItems && punto.registros.length === 0 && (
              <p className="text-sm text-muted-foreground">Los registros se crean desde el alcance, eligiendo qué cubre cada uno.</p>
            )}
            {carga && !cerrado && !porItems && punto.planillas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {punto.planillas.map((pl) => (
                  <Button key={pl.planillaId} size="sm" variant="outline" disabled={crearRegistro.isPending} onClick={() => nuevoRegistro(pl.planillaId)}>
                    {crearRegistro.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Nuevo {pl.codigo ?? pl.nombre}
                  </Button>
                ))}
              </div>
            )}
          </section>

          {/* ── Documentos ────────────────────────────────────────── */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Documentos {tieneRd && <span className="font-normal text-muted-foreground">· el documento revisado es obligatorio (RD)</span>}</h3>
            {punto.documentos.length === 0 && <p className="text-sm text-muted-foreground">Sin documentos.</p>}
            {punto.documentos.length > 0 && (
              <ul className="divide-y rounded-md border">
                {punto.documentos.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <button className="flex min-w-0 items-center gap-2 text-left hover:underline" onClick={() => abrirDocumento(d.id).catch((e) => setError(e.message))}>
                      <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">{d.nombre}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{tamanio(d.tamanioBytes)}</span>
                    </button>
                    {carga && punto.firmas.length === 0 && (
                      <Button size="icon" variant="ghost" title="Quitar" onClick={() => eliminarDoc.mutateAsync(d.id).catch((e) => setError(e.message))}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {carga && !cerrado && (
              <>
                <input ref={input} type="file" className="hidden" accept=".pdf,image/*,.xlsx,.xls,.docx,.doc" onChange={(e) => subirDocumento(e.target.files?.[0])} />
                <Button size="sm" variant="outline" disabled={subir.isPending} onClick={() => input.current?.click()}>
                  {subir.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Adjuntar documento
                </Button>
              </>
            )}
          </section>

          {/* ── Firmas ────────────────────────────────────────────── */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Firmas del punto</h3>
            <ul className="divide-y rounded-md border">
              {intervienen.map((i) => {
                const parte = pie.partes.find((p) => p.id === i.parteId)
                const deLaParte = punto.firmas.filter((f) => f.parteId === i.parteId)
                const firma = deLaParte.filter((f) => f.vigente).at(-1)
                const previa = firma ? undefined : deLaParte.at(-1)
                const mia = pie.misPartes.includes(i.parteId)
                return (
                  <li key={i.parteId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <TipoBadge tipo={i.tipo} />
                      <div className="min-w-0">
                        <div className="font-medium">{parte?.nombre}</div>
                        {firma
                          ? <div className="text-xs text-green-700">{firma.usuarioNombre} · {fecha(firma.fechaFirma)}{firma.comentario ? ` · “${firma.comentario}”` : ""}</div>
                          : previa
                            ? <div className="text-xs text-violet-700">Firmó {previa.usuarioNombre} el {fecha(previa.fechaFirma)}, antes de ampliar el alcance: falta volver a firmar</div>
                            : <div className="text-xs text-muted-foreground">Firma con el rol “{parte?.rolFirma ?? "—"}”</div>}
                      </div>
                    </div>
                    {firma ? (
                      (mia || catalogo) && !hojaCerrada && (
                        <Button size="sm" variant="ghost" className="text-red-700" onClick={() => { setErrorDialogo(null); setDialogo({ tipo: "anular", firma }) }}>
                          <XCircle className="h-3.5 w-3.5" /> Anular
                        </Button>
                      )
                    ) : (
                      mia && !punto.noAplica && !hojaCerrada && (
                        <Button size="sm" disabled={!puedeFirmar} onClick={() => onFirmar(punto, i.parteId)}>
                          <PenLine className="h-3.5 w-3.5" /> {previa ? "Volver a firmar" : "Firmar"}
                        </Button>
                      )
                    )}
                  </li>
                )
              })}
            </ul>
            {pie.misPartes.length === 0 && <p className="text-xs text-muted-foreground">No tenés en el proyecto el rol de firma de ninguna parte de este PIE.</p>}
          </section>

          {gestion && !hojaCerrada && (
            <section className="border-t pt-4">
              {punto.noAplica ? (
                <Button size="sm" variant="outline" disabled={quitarNa.isPending} onClick={() => quitarNa.mutateAsync(punto.id).catch((e) => setError(e.message))}>
                  <Undo2 className="h-3.5 w-3.5" /> Vuelve a aplicar
                </Button>
              ) : punto.firmas.length === 0 && (
                <Button size="sm" variant="outline" onClick={() => { setErrorDialogo(null); setDialogo({ tipo: "na" }) }}>
                  <MinusCircle className="h-3.5 w-3.5" /> Marcar como No aplica
                </Button>
              )}
            </section>
          )}

          {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}
        </div>

        <DialogoTexto
          abierto={dialogo !== null}
          titulo={dialogo?.tipo === "na" ? `El punto ${punto.numero} no aplica` : "Anular firma"}
          descripcion={dialogo?.tipo === "na"
            ? "No se firma y se descuenta del total del avance. Queda el motivo en el PIE y en el PDF."
            : `Se anula la firma de ${dialogo?.tipo === "anular" ? dialogo.firma.usuarioNombre : ""}. Queda registrada con el motivo.`}
          etiqueta="Motivo"
          obligatorio
          destructivo={dialogo?.tipo === "anular"}
          accion={dialogo?.tipo === "na" ? "Marcar No aplica" : "Anular firma"}
          pendiente={noAplica.isPending || anular.isPending}
          error={errorDialogo}
          onCancelar={() => setDialogo(null)}
          onConfirmar={confirmarDialogo}
        />
      </SheetContent>
    </Sheet>
  )
}
