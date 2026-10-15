"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileDown, Link2, MessageSquare } from "lucide-react"

import {
  useAgregarComentario,
  useGetNoConformidad,
} from "@/features/no-conformidades/api/use-no-conformidades"
import {
  NC_ESTADO_COLOR,
  NC_ESTADO_LABEL,
  NC_ESTADO_NARRATIVA,
  NC_SEVERIDAD,
  NC_SEVERIDAD_COLOR,
  type NoConformidadHistorial,
} from "@/features/no-conformidades/types"
import { NcAccionesPanel } from "@/features/no-conformidades/components/nc-acciones-panel"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

/**
 * Detalle del informe. Es página y no sheet a propósito: una No Conformidad vive
 * semanas o meses, se referencia por código en mails y reuniones, y necesita URL
 * propia para poder compartirse. Es el mismo criterio que sigue Registro —el
 * documento más parecido del sistema— frente a Pendiente, que sí es un sheet
 * porque es un ítem operativo que se mira de reojo.
 *
 * Layout de dos columnas: a la izquierda lo que se lee y se completa (etapas y
 * acción disponible), a la derecha la traza (historial con firmas y comentarios).
 */
export default function NoConformidadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading } = useGetNoConformidad(id)
  const nc = data?.data

  const [comentario, setComentario] = useState("")
  const agregarComentario = useAgregarComentario()

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Cargando…</div>
  }

  if (!nc) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-muted-foreground">No se encontró el informe.</p>
        <Button asChild variant="outline">
          <Link href="/calidad/no-conformidades">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link href="/calidad/no-conformidades">
              <ArrowLeft className="mr-2 h-4 w-4" />
              No Conformidades
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold">{nc.codigoFormateado}</h1>
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
            {nc.eficaciaVencida && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                Eficacia vencida
              </span>
            )}
          </div>
          <h2 className="mt-1 text-lg">{nc.titulo}</h2>
          <p className="text-sm text-muted-foreground">
            {NC_ESTADO_NARRATIVA[nc.estadoNombre] ?? ""}
          </p>
        </div>

        {/* Descarga directa: el proxy reenvia el blob con su Content-Disposition,
            asi que un <a> alcanza y el archivo sale con el codigo como nombre. */}
        <Button asChild variant="outline">
          <a
            href={`/api/no-conformidades/${nc.id}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Descargar PDF
          </a>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* ── Columna izquierda: datos, acción y contenido de las etapas ── */}
        <div className="space-y-4">
          <section className="rounded-md border p-4">
            <h3 className="mb-3 text-sm font-semibold">Datos del informe</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
              <Dato k="Tipo" v={`${nc.tipoCodigo} — ${nc.tipoNombre}`} />
              <Dato k="Motivo" v={nc.motivoNombre} />
              <Dato k="Detectado por" v={nc.detectadoPorNombre} />
              <Dato k="Área afectada" v={nc.grupoAfectadoNombre} />
              <Dato k="Área de seguimiento" v={nc.grupoSeguimientoNombre} />
              <Dato k="Especialidad" v={nc.especialidadNombre} />
              <Dato k="Subsistema" v={nc.subSistemaCodigo} />
              <Dato k="Elemento" v={nc.elementoTag} />
              <Dato k="Detección" v={fecha(nc.fechaDeteccion)} />
              <Dato k="Compromiso" v={fecha(nc.fechaCompromiso)} />
              <Dato k="Cierre" v={fecha(nc.fechaCierre)} />
              <Dato k="Cancelación" v={fecha(nc.fechaCancelacion)} />
            </dl>

            {!nc.subSistemaId && (
              <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
                Sin subsistema asociado: este informe no bloquea la emisión de
                certificados.
              </p>
            )}

            {/* Encadenado por ineficacia, en los dos sentidos */}
            {nc.generadaDesdeNoConformidadId && (
              <p className="mt-2 text-xs text-muted-foreground">
                Generado porque la acción de{" "}
                <Link
                  href={`/calidad/no-conformidades/${nc.generadaDesdeNoConformidadId}`}
                  className="font-mono underline"
                >
                  {nc.generadaDesdeCodigoFormateado}
                </Link>{" "}
                no fue eficaz.
              </p>
            )}
            {nc.generoNoConformidadId && (
              <p className="mt-2 text-xs text-muted-foreground">
                La acción no fue eficaz: se generó{" "}
                <Link
                  href={`/calidad/no-conformidades/${nc.generoNoConformidadId}`}
                  className="font-mono underline"
                >
                  {nc.generoCodigoFormateado}
                </Link>
                .
              </p>
            )}
          </section>

          <section className="rounded-md border p-4">
            <NcAccionesPanel nc={nc} />
          </section>

          <section className="space-y-4 rounded-md border p-4">
            <h3 className="text-sm font-semibold">Desarrollo del informe</h3>
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
            {!nc.accionInmediata && !nc.causaRaiz && (
              <p className="text-sm text-muted-foreground">
                Todavía no se registró contenido: el circuito recién empieza.
              </p>
            )}
          </section>

          {nc.pendientesVinculados.length > 0 && (
            <section className="rounded-md border p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Link2 className="h-4 w-4" />
                Pendientes vinculados ({nc.pendientesVinculados.length})
              </h3>
              <ul className="space-y-1 text-sm">
                {nc.pendientesVinculados.map((p) => (
                  <li key={p.pendienteId} className="flex flex-wrap items-center gap-2">
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
            </section>
          )}
        </div>

        {/* ── Columna derecha: la traza ── */}
        <div className="space-y-4">
          <section className="rounded-md border p-4">
            <h3 className="mb-3 text-sm font-semibold">
              Historial y firmas ({nc.historial.length})
            </h3>
            <ol className="space-y-3">
              {nc.historial.map((h) => (
                <FilaHistorial key={h.id} h={h} />
              ))}
            </ol>
          </section>

          <section className="rounded-md border p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              Comentarios ({nc.comentarios.length})
            </h3>
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
          </section>
        </div>
      </div>
    </div>
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
      <div className="w-20 shrink-0">
        {h.datosFirma ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={h.datosFirma} alt="Firma" className="max-h-12 object-contain" />
        ) : (
          <span className="text-[10px] text-muted-foreground">(sin firma)</span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">
          {de} → {a}
        </div>
        <div className="text-xs text-muted-foreground">
          {h.nombreFirmante ?? h.usuarioNombre ?? "—"}
          {h.empresaNombre ? ` · ${h.empresaNombre}` : ""}
        </div>
        <div className="text-xs text-muted-foreground">{fechaHora(h.fecha)}</div>
        {h.comentario && (
          <div className="mt-1 whitespace-pre-wrap text-sm">{h.comentario}</div>
        )}
      </div>
    </li>
  )
}

function Dato({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd>{v || "—"}</dd>
    </div>
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

/** El backend manda DateOnly como "2026-09-10". Se formatea sin pasar por Date. */
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
