"use client"

import { useState } from "react"
import {
  Clock, CheckCircle2, XCircle, Ban, Loader2, MessageSquarePlus,
  Paperclip, Trash2, Upload, Play, Send, ThumbsUp, ThumbsDown, X,
} from "lucide-react"

import { useOpenPendiente } from "../hooks/use-open-pendiente"
import { useGetPendiente } from "../api/use-get-pendiente"
import { useAgregarComentario } from "../api/use-agregar-comentario"
import { useSubirAdjunto, useEliminarAdjunto } from "../api/use-adjuntos"
import { usePendienteTransicion } from "../api/use-pendiente-workflow"
import {
  ESTADO_COLOR, ESTADO_LABEL, PENDIENTE_ESTADO_IDS, PRIORIDAD, PRIORIDAD_COLOR,
} from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function PendienteDetalleSheet() {
  const { id, isOpen, close } = useOpenPendiente()
  const { data, isLoading } = useGetPendiente(id)
  const p = data?.data

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          {isLoading ? (
            <SheetTitle className="text-gray-400">Cargando…</SheetTitle>
          ) : p ? (
            <>
              <SheetTitle className="text-lg font-bold flex items-center gap-2 flex-wrap">
                <span className="font-mono text-blue-700">{p.codigoFormateado}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[p.estadoNombre ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                  {ESTADO_LABEL[p.estadoNombre ?? ""] ?? p.estadoNombre}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${PRIORIDAD_COLOR[p.prioridad] ?? "bg-gray-100"}`}>
                  {PRIORIDAD[p.prioridad]}
                </span>
              </SheetTitle>
              <SheetDescription className="text-sm text-gray-700 whitespace-pre-wrap">
                {p.descripcion}
              </SheetDescription>
            </>
          ) : (
            <SheetTitle>Pendiente</SheetTitle>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 px-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : p ? (
          <div className="mt-4 px-4 pb-8 space-y-6">
            {/* Datos principales */}
            <section className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <DataItem label="Categoría"   value={p.categoriaNombre} />
              <DataItem label="Tipo"        value={p.tipoNombre} />
              <DataItem label="Detectado por" value={p.detectadoPorNombre} />
              <DataItem label="Responsable" value={p.responsableNombre} />
              <DataItem label="Subsistema"  value={p.subSistemaNombre} />
              <DataItem label="Elemento"    value={p.elementoTag ? `${p.elementoTag} — ${p.elementoNombre}` : null} />
              <DataItem label="Especialidad" value={p.especialidadNombre} />
              <DataItem label="PID"         value={p.pid} />
              <DataItem label="Circuito"    value={p.circuito} />
              <DataItem label="Detección"   value={p.fechaDeteccion} />
              <DataItem label="Cierre est." value={p.fechaCierreEstimado} />
              {p.fechaCierre && <DataItem label="Cierre real" value={p.fechaCierre} />}
              {p.fechaDesestimado && <DataItem label="Cancelado el" value={p.fechaDesestimado} />}
              {p.motivoRechazoCierre && (
                <div className="col-span-2 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <strong>Cierre rechazado:</strong> {p.motivoRechazoCierre}
                </div>
              )}
            </section>

            <Separator />

            {/* Acciones de workflow */}
            <Workflow pendienteId={p.id} estadoId={p.estadoId} />

            <Separator />

            {/* Comentarios */}
            <Comentarios pendienteId={p.id} comentarios={p.comentarios} />

            <Separator />

            {/* Adjuntos */}
            <Adjuntos pendienteId={p.id} adjuntos={p.adjuntos} />

            <Separator />

            {/* Historial */}
            <Historial historial={p.historial} />
          </div>
        ) : (
          <p className="text-sm text-destructive px-4 py-6">No se pudo cargar el pendiente.</p>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Workflow ────────────────────────────────────────────────────────────

function Workflow({ pendienteId, estadoId }: { pendienteId: string; estadoId: string }) {
  const transicion = usePendienteTransicion()
  const [dialog, setDialog] = useState<null | { accion: "rechazar" | "cancelar"; titulo: string; descripcion: string }>(null)
  const [motivo, setMotivo] = useState("")

  async function ejecutar(accion: "iniciar" | "enviar-aprobacion" | "aprobar", comentario?: string) {
    await transicion.mutateAsync({ id: pendienteId, accion, comentario: comentario ?? null })
  }

  async function ejecutarConMotivo() {
    if (!dialog) return
    if (!motivo.trim()) return
    await transicion.mutateAsync({ id: pendienteId, accion: dialog.accion, comentario: motivo })
    setDialog(null)
    setMotivo("")
  }

  const busy = transicion.isPending

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Acciones
      </h3>
      <div className="flex flex-wrap gap-2">
        {estadoId === PENDIENTE_ESTADO_IDS.ABIERTO && (
          <Button size="sm" disabled={busy} className="gap-1.5" onClick={() => ejecutar("iniciar")}>
            <Play className="h-3.5 w-3.5" /> Tomar / Iniciar
          </Button>
        )}
        {estadoId === PENDIENTE_ESTADO_IDS.EN_PROCESO && (
          <Button size="sm" disabled={busy} className="gap-1.5" onClick={() => ejecutar("enviar-aprobacion")}>
            <Send className="h-3.5 w-3.5" /> Enviar a aprobación
          </Button>
        )}
        {estadoId === PENDIENTE_ESTADO_IDS.PENDIENTE_APROBACION && (
          <>
            <Button size="sm" disabled={busy} className="gap-1.5 bg-green-700 hover:bg-green-600" onClick={() => ejecutar("aprobar")}>
              <ThumbsUp className="h-3.5 w-3.5" /> Aprobar cierre
            </Button>
            <Button
              size="sm" variant="outline" disabled={busy} className="gap-1.5"
              onClick={() => setDialog({
                accion: "rechazar",
                titulo: "Rechazar cierre",
                descripcion: "Indicá el motivo del rechazo. El pendiente vuelve a EN_PROCESO.",
              })}
            >
              <ThumbsDown className="h-3.5 w-3.5" /> Rechazar
            </Button>
          </>
        )}
        {estadoId !== PENDIENTE_ESTADO_IDS.CERRADO && estadoId !== PENDIENTE_ESTADO_IDS.CANCELADO && (
          <Button
            size="sm" variant="outline" disabled={busy} className="gap-1.5 text-red-600 hover:text-red-700"
            onClick={() => setDialog({
              accion: "cancelar",
              titulo: "Cancelar pendiente",
              descripcion: "Indicá el motivo. Esta acción no se puede deshacer.",
            })}
          >
            <Ban className="h-3.5 w-3.5" /> Cancelar
          </Button>
        )}
      </div>

      <AlertDialog open={dialog !== null} onOpenChange={(v) => !v && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{dialog?.descripcion}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo..."
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !motivo.trim()}
              onClick={(e) => { e.preventDefault(); ejecutarConMotivo() }}
            >
              {busy ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

// ─── Comentarios ─────────────────────────────────────────────────────────

function Comentarios({
  pendienteId,
  comentarios,
}: {
  pendienteId: string
  comentarios: { id: string; comentario: string; autorNombre: string | null; createdAt: string }[]
}) {
  const [texto, setTexto] = useState("")
  const agregar = useAgregarComentario()

  async function enviar() {
    if (!texto.trim()) return
    await agregar.mutateAsync({ pendienteId, comentario: texto.trim() })
    setTexto("")
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Comentarios ({comentarios.length})
      </h3>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {comentarios.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin comentarios todavía.</p>
        ) : (
          comentarios.map((c) => (
            <div key={c.id} className="rounded-md border bg-gray-50 px-3 py-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-medium text-gray-700">{c.autorNombre ?? "—"}</span>
                <span>{formatFecha(c.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap mt-1">{c.comentario}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 items-end">
        <Textarea
          placeholder="Agregar comentario..."
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={agregar.isPending}
        />
        <Button size="sm" disabled={!texto.trim() || agregar.isPending} onClick={enviar}>
          {agregar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar"}
        </Button>
      </div>
    </section>
  )
}

// ─── Adjuntos ────────────────────────────────────────────────────────────

function Adjuntos({
  pendienteId,
  adjuntos,
}: {
  pendienteId: string
  adjuntos: { id: string; fileName: string; url: string; createdAt: string; createdByNombre: string | null }[]
}) {
  const subir = useSubirAdjunto()
  const eliminar = useEliminarAdjunto(pendienteId)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await subir.mutateAsync({ pendienteId, file })
    e.target.value = ""
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" />
        Adjuntos ({adjuntos.length})
      </h3>

      <div className="flex flex-col gap-2">
        {adjuntos.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin adjuntos.</p>
        ) : (
          adjuntos.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm">
              <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline truncate flex-1">
                {a.fileName}
              </a>
              <span className="text-xs text-muted-foreground mx-3 truncate">
                {a.createdByNombre} · {formatFecha(a.createdAt)}
              </span>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-red-600"
                disabled={eliminar.isPending}
                onClick={() => eliminar.mutate(a.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-blue-700 hover:underline">
        {subir.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Subir archivo
        <input type="file" className="hidden" onChange={onPick} disabled={subir.isPending} />
      </label>
    </section>
  )
}

// ─── Historial ───────────────────────────────────────────────────────────

function Historial({
  historial,
}: {
  historial: {
    id: string
    estadoAnteriorNombre: string | null
    estadoNuevoNombre: string | null
    responsableAnteriorNombre: string | null
    responsableNuevoNombre: string | null
    comentario: string | null
    fecha: string
    usuarioNombre: string | null
  }[]
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Historial
      </h3>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {historial.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin movimientos registrados.</p>
        ) : (
          historial.map((h) => (
            <div key={h.id} className="text-xs flex gap-3 items-start border-l-2 border-gray-200 pl-3 py-1">
              <div className="flex-1">
                <p className="font-medium text-gray-800">
                  {h.estadoAnteriorNombre && h.estadoAnteriorNombre !== h.estadoNuevoNombre
                    ? `${h.estadoAnteriorNombre} → ${h.estadoNuevoNombre}`
                    : h.estadoNuevoNombre}
                </p>
                {h.responsableAnteriorNombre && h.responsableAnteriorNombre !== h.responsableNuevoNombre && (
                  <p className="text-muted-foreground">
                    Responsable: {h.responsableAnteriorNombre ?? "—"} → {h.responsableNuevoNombre ?? "—"}
                  </p>
                )}
                {h.comentario && <p className="text-gray-600 whitespace-pre-wrap mt-0.5">{h.comentario}</p>}
                <p className="text-muted-foreground mt-0.5">{h.usuarioNombre} · {formatFecha(h.fecha)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function DataItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  )
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}
