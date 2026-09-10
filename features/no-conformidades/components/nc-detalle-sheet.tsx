"use client"

import { useState } from "react"
import { Link2, MessageSquare } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

import {
  useAgregarComentario,
  useGetNoConformidad,
} from "../api/use-no-conformidades"
import {
  NC_ESTADO_COLOR,
  NC_ESTADO_LABEL,
  NC_ESTADO_NARRATIVA,
  NC_SEVERIDAD,
  NC_SEVERIDAD_COLOR,
  type NoConformidadHistorial,
} from "../types"
import { NcAccionesPanel } from "./nc-acciones-panel"

interface Props {
  id: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoConformidadDetalleSheet({ id, open, onOpenChange }: Props) {
  const { data, isLoading } = useGetNoConformidad(open ? id : null)
  const nc = data?.data

  const [comentario, setComentario] = useState("")
  const agregarComentario = useAgregarComentario()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {isLoading && <div className="p-6 text-muted-foreground">Cargando…</div>}

        {!isLoading && !nc && (
          <div className="p-6 text-muted-foreground">No se encontró el informe.</div>
        )}

        {nc && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono">{nc.codigoFormateado}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    NC_ESTADO_COLOR[nc.estadoNombre] ?? ""
                  }`}
                >
                  {NC_ESTADO_LABEL[nc.estadoNombre] ?? nc.estadoNombre}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    NC_SEVERIDAD_COLOR[nc.severidad] ?? ""
                  }`}
                >
                  {NC_SEVERIDAD[nc.severidad]}
                </span>
              </SheetTitle>
              <SheetDescription>
                {/* Decirle al usuario de quién depende el próximo paso evita que
                    tenga que conocer el circuito de memoria. */}
                {NC_ESTADO_NARRATIVA[nc.estadoNombre] ?? ""}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 p-4">
              <div>
                <h3 className="text-lg font-semibold">{nc.titulo}</h3>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <Dato k="Tipo" v={`${nc.tipoCodigo} — ${nc.tipoNombre}`} />
                  <Dato k="Motivo" v={nc.motivoNombre} />
                  <Dato k="Área afectada" v={nc.grupoAfectadoNombre} />
                  <Dato k="Área de seguimiento" v={nc.grupoSeguimientoNombre} />
                  <Dato k="Subsistema" v={nc.subSistemaCodigo} />
                  <Dato k="Elemento" v={nc.elementoTag} />
                  <Dato k="Detectado por" v={nc.detectadoPorNombre} />
                  <Dato k="Detección" v={fecha(nc.fechaDeteccion)} />
                  <Dato k="Compromiso" v={fecha(nc.fechaCompromiso)} />
                  <Dato k="Cierre" v={fecha(nc.fechaCierre)} />
                </dl>

                {!nc.subSistemaId && (
                  <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
                    Sin subsistema asociado: este informe no bloquea la emisión de
                    certificados.
                  </p>
                )}

                {/* Encadenado por ineficacia — en los dos sentidos. */}
                {nc.generadaDesdeCodigoFormateado && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Generado porque la acción de{" "}
                    <span className="font-mono">{nc.generadaDesdeCodigoFormateado}</span> no
                    fue eficaz.
                  </p>
                )}
                {nc.generoCodigoFormateado && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    La acción no fue eficaz: se generó{" "}
                    <span className="font-mono">{nc.generoCodigoFormateado}</span>.
                  </p>
                )}
              </div>

              <Separator />

              {/* Panel de la acción que corresponde al estado actual */}
              <NcAccionesPanel nc={nc} />

              <Separator />

              {/* Contenido acumulado de las etapas ya recorridas */}
              <div className="space-y-3">
                <Etapa titulo="Acción inmediata" texto={nc.accionInmediata} />
                <Etapa titulo="Causa raíz" texto={nc.causaRaiz} />
                <Etapa titulo="Acción correctiva" texto={nc.accionCorrectiva} />
                <Etapa titulo="Plan de mejora" texto={nc.planMejora} />
                <Etapa
                  titulo="Objetivo de eficacia"
                  texto={
                    nc.objetivoEficacia
                      ? `${nc.objetivoEficacia}\nMedición prevista: ${fecha(
                          nc.fechaEvaluacionEficacia,
                        )}`
                      : null
                  }
                />
                <Etapa
                  titulo="Resultado de eficacia"
                  texto={
                    nc.resultadoEficacia
                      ? `${nc.resultadoEficacia}\n${
                          nc.fueEficaz ? "Fue eficaz." : "No fue eficaz."
                        }`
                      : null
                  }
                />
              </div>

              {nc.pendientesVinculados.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Link2 className="h-4 w-4" />
                      Pendientes vinculados
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {nc.pendientesVinculados.map((p) => (
                        <li key={p.pendienteId} className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {p.pendienteCodigoFormateado}
                          </span>
                          <span className="text-muted-foreground">{p.descripcion}</span>
                          {p.esOrigen && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">
                              origen
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <Separator />

              {/* Historial: la traza completa, incluidos los rebotes de revisión */}
              <div>
                <h4 className="mb-3 text-sm font-semibold">Historial y firmas</h4>
                <ol className="space-y-3">
                  {nc.historial.map((h) => (
                    <FilaHistorial key={h.id} h={h} />
                  ))}
                </ol>
              </div>

              <Separator />

              {/* Comentarios */}
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  Comentarios ({nc.comentarios.length})
                </h4>
                <ul className="mb-3 space-y-2">
                  {nc.comentarios.map((c) => (
                    <li key={c.id} className="rounded border p-2 text-sm">
                      <div className="text-xs text-muted-foreground">
                        {c.createdByNombre} · {fechaHora(c.createdAt)}
                      </div>
                      <div className="whitespace-pre-wrap">{c.comentario}</div>
                    </li>
                  ))}
                  {nc.comentarios.length === 0 && (
                    <li className="text-sm text-muted-foreground">Sin comentarios.</li>
                  )}
                </ul>
                <Textarea
                  placeholder="Escribí un comentario…"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
                <Button
                  className="mt-2"
                  size="sm"
                  disabled={!comentario.trim() || agregarComentario.isPending}
                  onClick={() =>
                    agregarComentario.mutate(
                      { id: nc.id, comentario: comentario.trim() },
                      { onSuccess: () => setComentario("") },
                    )
                  }
                >
                  Comentar
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function FilaHistorial({ h }: { h: NoConformidadHistorial }) {
  const de = h.estadoAnteriorNombre
    ? NC_ESTADO_LABEL[h.estadoAnteriorNombre] ?? h.estadoAnteriorNombre
    : "Alta"
  const a = NC_ESTADO_LABEL[h.estadoNuevoNombre] ?? h.estadoNuevoNombre

  return (
    <li className="flex gap-3 rounded border p-2">
      {/* La firma es un snapshot inmutable: aunque el usuario la cambie después,
          acá queda la que había al firmar. */}
      <div className="w-24 shrink-0">
        {h.datosFirma ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={h.datosFirma} alt="Firma" className="max-h-12 object-contain" />
        ) : (
          <span className="text-[10px] text-muted-foreground">(sin firma cargada)</span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">
          {de} → {a}
        </div>
        <div className="text-xs text-muted-foreground">
          {h.nombreFirmante ?? h.usuarioNombre ?? "—"}
          {h.empresaNombre ? ` · ${h.empresaNombre}` : ""} · {fechaHora(h.fecha)}
        </div>
        {h.comentario && (
          <div className="mt-1 whitespace-pre-wrap text-sm">{h.comentario}</div>
        )}
      </div>
    </li>
  )
}

function Dato({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v || "—"}</dd>
    </>
  )
}

function Etapa({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null
  return (
    <div>
      <h4 className="text-sm font-semibold">{titulo}</h4>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{texto}</p>
    </div>
  )
}

function fecha(v: string | null | undefined) {
  if (!v) return "—"
  const [y, m, d] = v.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

function fechaHora(v: string | null | undefined) {
  if (!v) return "—"
  const dt = new Date(v)
  if (Number.isNaN(dt.getTime())) return "—"
  return dt.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
}
