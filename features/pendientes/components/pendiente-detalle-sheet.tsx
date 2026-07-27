"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Clock, CheckCircle2, XCircle, Ban, Loader2, MessageSquarePlus,
  Paperclip, Trash2, Upload, Play, Send, ThumbsUp, ThumbsDown, X, Pencil,
  FileDown, FileUp, MapPin, ListChecks,
} from "lucide-react"

import { PendienteCargaFisicaUploader } from "./pendiente-carga-fisica-uploader"

import { useOpenPendiente } from "../hooks/use-open-pendiente"
import { useGetPendiente } from "../api/use-get-pendiente"
import { useAgregarComentario } from "../api/use-agregar-comentario"
import { useSubirAdjunto, useEliminarAdjunto } from "../api/use-adjuntos"
import { useCanWrite } from "@/lib/use-roles"
import { usePendienteTransicion } from "../api/use-pendiente-workflow"
import { useUpdatePendiente } from "../api/use-update-pendiente"
import { PendienteForm } from "./pendiente-form"
import type { PendienteFormValues } from "../schema"
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

interface PendienteDetalleSheetProps {
  /** Oculta el backdrop — usado desde el visor de PID para no tapar el plano. */
  hideOverlay?: boolean
  /** Sheet ancho (4xl en vez del default 2xl). Útil en el listado global. */
  wide?: boolean
}

export function PendienteDetalleSheet({ hideOverlay, wide }: PendienteDetalleSheetProps = {}) {
  const { id, isOpen, close } = useOpenPendiente()
  const { data, isLoading } = useGetPendiente(id)
  const p = data?.data
  const [isEditing, setIsEditing] = useState(false)
  const [cargaFisicaOpen, setCargaFisicaOpen] = useState(false)
  // Estamos dentro del visor de PID cuando la URL activa arranca con /ejecucion/pids/.
  // En ese contexto ocultamos "Ver en PID" (redundante) y mostramos en su lugar
  // "Ver pendientes de este PID" que lleva al listado filtrado.
  const pathname = usePathname()
  const enPidViewer = pathname?.startsWith("/ejecucion/pids/") ?? false
  // Consultor/Auditor: solo lectura del pendiente (ni editar ni workflow ni comentarios).
  const canWrite = useCanWrite()

  // Al cambiar de pendiente o cerrar el sheet, salimos del modo edición.
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setCargaFisicaOpen(false)
    }
  }, [isOpen, id])

  const puedeEditar = canWrite && p?.estadoId === PENDIENTE_ESTADO_IDS.ABIERTO

  // Interceptamos el intento de cerrar (X, click fuera, Escape) para que en
  // modo edición sólo salgamos del modo edit y el detalle quede visible.
  // Cerrar el sheet completo requiere una segunda acción (X con el detalle
  // ya en pantalla, o el botón "Cancelar" del form de edición).
  const handleOpenChange = (open: boolean) => {
    if (open) return
    if (isEditing) {
      setIsEditing(false)
      return
    }
    close()
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        className={`w-full overflow-y-auto ${wide ? "sm:max-w-4xl!" : "sm:max-w-2xl!"}`}
        hideOverlay={hideOverlay}
      >
        {/* Header sticky para que código + estado + acciones queden accesibles
            al scrollear un pendiente con historial largo. `pr-10` deja espacio
            para la X de cerrar del sheet (top-3 right-3). */}
        <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pr-10">
          {isLoading ? (
            <SheetTitle className="text-gray-400">Cargando…</SheetTitle>
          ) : p ? (
            <>
              <SheetTitle className="text-base sm:text-lg font-bold flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-mono text-blue-700">{p.codigoFormateado}</span>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[p.estadoNombre ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                  {ESTADO_LABEL[p.estadoNombre ?? ""] ?? p.estadoNombre}
                </span>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-medium ${PRIORIDAD_COLOR[p.prioridad] ?? "bg-gray-100"}`}>
                  {PRIORIDAD[p.prioridad]}
                </span>
              </SheetTitle>
              {!isEditing && (
                <>
                  <SheetDescription className="text-sm text-gray-700 whitespace-pre-wrap">
                    {p.descripcion}
                  </SheetDescription>
                  {/* Barra de acciones compacta — solo íconos en mobile con
                      tooltip por `title`, ícono + label corto en sm+. Botones
                      chicos (h-8) para no ocupar mucho vertical en el header
                      sticky. En mobile las acciones de workflow (Iniciar/Enviar/
                      Aprobar/Rechazar/Cancelar) se meten a la misma fila para
                      compactar; en sm+ el workflow vive en el content. */}
                  {/* Layout de dos grupos: acciones de utilidad a la izquierda
                      (Descargar/Cargar/Ver en PID/Editar), acciones de workflow
                      a la derecha (Iniciar/Enviar/Aprobar/Rechazar/Cancelar).
                      `justify-between` los separa; ambos son flex-wrap para
                      resbalar a una segunda línea si no entran. En sm+ el
                      workflow no aparece acá (queda en el content). */}
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Descargar primero — es la acción más frecuente. */}
                      {!p.tienePdfFisico && (
                        <Button asChild size="sm" variant="outline" className="gap-1 h-8 px-2 sm:px-2.5 text-xs">
                          <a href={`/api/pendientes/${p.id}/pdf`} target="_blank" rel="noreferrer" title="Descargar PDF">
                            <FileDown className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">PDF</span>
                          </a>
                        </Button>
                      )}
                      {p.tienePdfFisico && (
                        <Button asChild size="sm" variant="outline" className="gap-1 h-8 px-2 sm:px-2.5 text-xs">
                          <a
                            href={`/api/pendientes/${p.id}/pdf-fisico`}
                            target="_blank"
                            rel="noreferrer"
                            title="Descargar PDF Firmado"
                          >
                            <FileDown className="h-3.5 w-3.5 text-emerald-700" />
                            <span className="hidden sm:inline">PDF Firmado</span>
                          </a>
                        </Button>
                      )}
                      {/* Cargar después — es la acción "más pesada" (cierra el
                          pendiente al confirmar). */}
                      {canWrite
                        && p.estadoId !== PENDIENTE_ESTADO_IDS.CERRADO
                        && p.estadoId !== PENDIENTE_ESTADO_IDS.CANCELADO && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-8 px-2 sm:px-2.5 text-xs"
                          onClick={() => setCargaFisicaOpen(true)}
                          title="Cargar PDF Firmado"
                        >
                          <FileUp className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Cargar</span>
                        </Button>
                      )}
                      {/* Acceso directo al pin en el visor de PID. Se oculta si
                          ya estamos en /ejecucion/pids/* — sería redundante. */}
                      {!enPidViewer && p.pidArchivoId && p.pidPagina && (
                        <Button asChild size="sm" variant="outline" className="gap-1 h-8 px-2 sm:px-2.5 text-xs">
                          <a
                            href={`/ejecucion/pids/${p.pidArchivoId}?p=${p.pidPagina}&pin=${p.id}`}
                            title={p.pidArchivoCodigo ? `Ver en ${p.pidArchivoCodigo}` : "Ver en el PID"}
                          >
                            <MapPin className="h-3.5 w-3.5 text-blue-700" />
                            <span className="hidden sm:inline">Ver en PID</span>
                          </a>
                        </Button>
                      )}
                      {/* Contexto inverso: dentro del visor de PID, dar salida al
                          listado global filtrado por este PID. */}
                      {enPidViewer && p.pidArchivoId && (
                        <Button asChild size="sm" variant="outline" className="gap-1 h-8 px-2 sm:px-2.5 text-xs">
                          <a
                            href={`/ejecucion/pendientes?pidArchivoId=${p.pidArchivoId}`}
                            target="_blank"
                            rel="noreferrer"
                            title={p.pidArchivoCodigo ? `Ver pendientes de ${p.pidArchivoCodigo}` : "Ver pendientes de este PID"}
                          >
                            <ListChecks className="h-3.5 w-3.5 text-blue-700" />
                            <span className="hidden sm:inline">Pendientes del PID</span>
                          </a>
                        </Button>
                      )}
                      {puedeEditar && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-8 px-2 sm:px-2.5 text-xs"
                          onClick={() => setIsEditing(true)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                      )}
                    </div>

                    {/* Grupo derecho — acciones del workflow (mobile only). En
                        sm+ vive en el content bajo el título "Acciones". */}
                    {canWrite && (
                      <div className="sm:hidden flex flex-wrap items-center gap-1">
                        <Workflow pendienteId={p.id} estadoId={p.estadoId} compact />
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <SheetTitle>Pendiente</SheetTitle>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 px-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : p && isEditing ? (
          <EditarPendiente
            pendiente={p}
            onDone={() => setIsEditing(false)}
          />
        ) : p ? (
          <div className="mt-4 px-3 sm:px-4 pb-8 space-y-6">
            {/* Workflow / acciones de transición arriba del detalle. En mobile
                ya se rendera en el header sticky (ver arriba); acá aparece solo
                en sm+ donde el header no tiene lugar para meterlo. */}
            {canWrite && (
              <div className="hidden sm:block">
                <Workflow pendienteId={p.id} estadoId={p.estadoId} />
              </div>
            )}

            {canWrite && <Separator className="hidden sm:block" />}

            {/* Datos principales — 1 columna en mobile (más legible con valores
                largos como TAG-1234 — Nombre), 2 columnas en sm+. `sm:col-span-2`
                para el warning de rechazo se aplica solo cuando hay 2 columnas. */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 text-sm">
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
                <div className="sm:col-span-2 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <strong>Cierre rechazado:</strong> {p.motivoRechazoCierre}
                </div>
              )}
            </section>

            <Separator />

            {/* Comentarios */}
            <Comentarios pendienteId={p.id} comentarios={p.comentarios} canWrite={canWrite} />

            <Separator />

            {/* Adjuntos */}
            <Adjuntos pendienteId={p.id} adjuntos={p.adjuntos} canWrite={canWrite} />

            <Separator />

            {/* Historial */}
            <Historial historial={p.historial} />
          </div>
        ) : (
          <p className="text-sm text-destructive px-4 py-6">No se pudo cargar el pendiente.</p>
        )}
      </SheetContent>

      {/* Dialog de carga física. Se abre desde el botón "Cargar físico" del header
          del sheet. Reusa el mismo uploader que la ruta /pendiente-carga/{id}.
          El content es más ancho, tiene ring más marcado y sombra fuerte para
          separarse del PID de fondo. El overlay usa bg-black/40 + blur más
          intenso porque el sheet debajo (en el visor de PID) no monta backdrop. */}
      <AlertDialog
        open={cargaFisicaOpen}
        onOpenChange={(v) => setCargaFisicaOpen(v)}
      >
        <AlertDialogContent
          className="max-w-[min(92vw,720px)] sm:max-w-2xl! ring-2 ring-black/20 shadow-2xl"
          overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-sm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Cargar PDF firmado del pendiente</AlertDialogTitle>
            <AlertDialogDescription>
              Al confirmar el archivo, el pendiente pasa directamente a{" "}
              <strong>Cerrado</strong> — se asume que las firmas están en el papel.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {p && (
            <PendienteCargaFisicaUploader
              pendienteId={p.id}
              codigoFormateado={p.codigoFormateado}
              onSuccess={() => setCargaFisicaOpen(false)}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}

// ─── Workflow ────────────────────────────────────────────────────────────

function Workflow({
  pendienteId,
  estadoId,
  compact = false,
}: {
  pendienteId: string
  estadoId: string
  /** Variante compacta para embeber en el header sticky: sin título "Acciones" y botones más chicos. */
  compact?: boolean
}) {
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

  // Botones más compactos cuando embebido en header sticky (mobile).
  const btnBase = compact ? "gap-1 h-8 px-2 sm:px-2.5 text-xs" : "gap-1.5 h-9 sm:h-8"
  const iconSize = "h-3.5 w-3.5"

  const botones = (
    <>
      {estadoId === PENDIENTE_ESTADO_IDS.ABIERTO && (
        <Button size="sm" disabled={busy} className={btnBase} onClick={() => ejecutar("iniciar")}>
          <Play className={iconSize} /> Iniciar
        </Button>
      )}
      {estadoId === PENDIENTE_ESTADO_IDS.EN_PROCESO && (
        <Button size="sm" disabled={busy} className={btnBase} onClick={() => ejecutar("enviar-aprobacion")}>
          <Send className={iconSize} /> {compact ? "Enviar" : "Enviar a aprobación"}
        </Button>
      )}
      {estadoId === PENDIENTE_ESTADO_IDS.PENDIENTE_APROBACION && (
        <>
          <Button size="sm" disabled={busy} className={`${btnBase} bg-green-700 hover:bg-green-600`} onClick={() => ejecutar("aprobar")}>
            <ThumbsUp className={iconSize} /> {compact ? "Aprobar" : "Aprobar cierre"}
          </Button>
          <Button
            size="sm" variant="outline" disabled={busy} className={btnBase}
            onClick={() => setDialog({
              accion: "rechazar",
              titulo: "Rechazar cierre",
              descripcion: "Indicá el motivo del rechazo. El pendiente vuelve a EN_PROCESO.",
            })}
          >
            <ThumbsDown className={iconSize} /> Rechazar
          </Button>
        </>
      )}
      {estadoId !== PENDIENTE_ESTADO_IDS.CERRADO && estadoId !== PENDIENTE_ESTADO_IDS.CANCELADO && (
        <Button
          size="sm" variant="outline" disabled={busy}
          className={`${btnBase} text-red-600 hover:text-red-700`}
          onClick={() => setDialog({
            accion: "cancelar",
            titulo: "Cancelar pendiente",
            descripcion: "Indicá el motivo. Esta acción no se puede deshacer.",
          })}
        >
          <Ban className={iconSize} /> Cancelar
        </Button>
      )}
    </>
  )

  // Modo compact: rendereamos los botones como fragment (sin section/wrapper)
  // para que se integren en el flex-wrap del parent — así en mobile los botones
  // de workflow quedan en la misma línea que Descargar / Cargar / Editar.
  // El dialog (para pedir motivo en Rechazar/Cancelar) va aparte al final.
  if (compact) {
    return (
      <>
        {botones}
        {renderDialog(dialog, motivo, setMotivo, ejecutarConMotivo, setDialog, busy)}
      </>
    )
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Acciones
      </h3>
      <div className="flex flex-wrap gap-2">{botones}</div>

      {renderDialog(dialog, motivo, setMotivo, ejecutarConMotivo, setDialog, busy)}
    </section>
  )
}

// Dialog compartido para pedir motivo en Rechazar / Cancelar. Extraído para
// que el modo compact del Workflow pueda usarlo sin duplicar el JSX.
function renderDialog(
  dialog: { accion: "rechazar" | "cancelar"; titulo: string; descripcion: string } | null,
  motivo: string,
  setMotivo: (v: string) => void,
  ejecutarConMotivo: () => void,
  setDialog: (v: null) => void,
  busy: boolean,
) {
  return (
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
  )
}

// ─── Comentarios ─────────────────────────────────────────────────────────

function Comentarios({
  pendienteId,
  comentarios,
  canWrite,
}: {
  pendienteId: string
  comentarios: { id: string; comentario: string; autorNombre: string | null; createdAt: string }[]
  canWrite: boolean
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

      {canWrite && (
        // Mobile: textarea full-width con botón "Enviar" debajo (también full).
        // Desktop: fila con botón chico a la derecha.
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <Textarea
            placeholder="Agregar comentario..."
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={agregar.isPending}
          />
          <Button
            size="sm"
            disabled={!texto.trim() || agregar.isPending}
            onClick={enviar}
            className="h-9 sm:h-8 w-full sm:w-auto"
          >
            {agregar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar"}
          </Button>
        </div>
      )}
    </section>
  )
}

// ─── Adjuntos ────────────────────────────────────────────────────────────

function Adjuntos({
  pendienteId,
  adjuntos,
  canWrite,
}: {
  pendienteId: string
  adjuntos: { id: string; fileName: string; url: string; createdAt: string; createdByNombre: string | null }[]
  canWrite: boolean
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
            // Mobile: nombre arriba (link tapeable, full-width), meta+trash abajo.
            // Desktop: fila con nombre a la izquierda, meta al centro, trash a la
            // derecha.
            <div
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 rounded-md border bg-white px-3 py-2 text-sm min-w-0"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 hover:underline truncate flex-1 min-w-0"
              >
                {a.fileName}
              </a>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs text-muted-foreground truncate">
                  {a.createdByNombre} · {formatFecha(a.createdAt)}
                </span>
                {canWrite && (
                  <Button
                    size="icon" variant="ghost"
                    className="h-9 w-9 sm:h-7 sm:w-7 shrink-0 text-red-600"
                    disabled={eliminar.isPending}
                    onClick={() => eliminar.mutate(a.id)}
                    aria-label="Eliminar adjunto"
                  >
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {canWrite && (
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-blue-700 hover:underline">
          {subir.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Subir archivo
          <input type="file" className="hidden" onChange={onPick} disabled={subir.isPending} />
        </label>
      )}
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
            <div key={h.id} className="text-xs flex gap-3 items-start border-l-2 border-gray-200 pl-3 py-1 min-w-0">
              <div className="flex-1 min-w-0 wrap-break-word">
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

// ─── Editar ──────────────────────────────────────────────────────────────

function EditarPendiente({
  pendiente,
  onDone,
}: {
  pendiente: {
    id: string
    categoriaId: string
    tipoId: string
    responsableId: string
    descripcion: string
    prioridad: number
    fechaCierreEstimado: string
    subSistemaId: string | null
    elementoId: string | null
    especialidadId: string | null
    pid: string | null
    circuito: string | null
    nivelId?: string | null
    accionId?: string | null
    motivoId?: string | null
  }
  onDone: () => void
}) {
  const update = useUpdatePendiente(pendiente.id)

  const onSubmit = async (values: PendienteFormValues) => {
    // El endpoint PUT /pendientes/{id} no toca responsable — se ignora.
    // Circuito quedó deprecado del form pero mantenemos la columna en BD;
    // enviamos null para no borrar valores viejos indirectamente.
    await update.mutateAsync({
      categoriaId: values.categoriaId,
      tipoId: values.tipoId,
      descripcion: values.descripcion,
      prioridad: values.prioridad,
      fechaCierreEstimado: values.fechaCierreEstimado,
      subSistemaId: values.subSistemaId ?? null,
      elementoId: values.elementoId ?? null,
      especialidadId: values.especialidadId,
      pid: values.pid ?? null,
      circuito: null,
      nivelId: values.nivelId,
      accionId: values.accionId,
      motivoId: values.motivoId,
    })
    onDone()
  }

  return (
    <div className="mt-4 px-3 sm:px-4 pb-8">
      <PendienteForm
        defaultValues={{
          nivelId: pendiente.nivelId ?? undefined,
          accionId: pendiente.accionId ?? undefined,
          motivoId: pendiente.motivoId ?? undefined,
          categoriaId: pendiente.categoriaId,
          tipoId: pendiente.tipoId,
          responsableId: pendiente.responsableId,
          descripcion: pendiente.descripcion,
          prioridad: pendiente.prioridad,
          fechaCierreEstimado: pendiente.fechaCierreEstimado.substring(0, 10),
          subSistemaId: pendiente.subSistemaId,
          elementoId: pendiente.elementoId,
          especialidadId: pendiente.especialidadId ?? undefined,
          pid: pendiente.pid,
        }}
        onSubmit={onSubmit}
        isPending={update.isPending}
        onCancel={onDone}
        readonlyResponsable
      />
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function DataItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    // `min-w-0` para que el DataItem colapse en grid parent. `wrap-break-word`
    // en el valor permite wrappear labels largos (ej "TAG-XXX — Nombre largo").
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5 wrap-break-word">{value}</dd>
    </div>
  )
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}
