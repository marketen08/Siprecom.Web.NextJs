"use client"

import { useRef, useState, type ComponentType } from "react"
import { useRouter } from "next/navigation"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetElementosTareasPorElemento } from "@/features/elementos-tareas/api/use-get-elementostareas-por-elemento"
import { useIniciarTarea } from "@/features/elementos-tareas/api/use-iniciar-tarea"
import { useReiniciarTarea } from "@/features/elementos-tareas/api/use-reiniciar-tarea"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useUploadRegistroArchivo } from "@/features/registros/api/use-registro-archivos"
import { useDownloadProcedimiento } from "@/features/procedimientos/api/use-download-procedimiento"
import { FirmaPanel } from "@/features/registros/components/firma-panel"
import type { AvanceElementoDTO } from "@/features/avance/types"
import { ESTADO_ELEMENTO_TAREA, type ElementoTarea } from "@/features/elementos-tareas/types"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertCircle, Clock, CheckCircle2, XCircle, Ban, BookOpen,
  Loader2, Play, FileText, Upload, Download, Eye, FileDown,
  MoreVertical, Paperclip, PenLine, RotateCcw,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  elementoId: string | null
  avance: AvanceElementoDTO | null
  open: boolean
  onClose: () => void
}

export function ElementoDetalleSheet({ elementoId, avance, open, onClose }: Props) {
  const router = useRouter()
  const { data: elementoRaw, isLoading: loadingElemento } = useGetElemento(elementoId)
  const { data: tareasRaw, isLoading: loadingTareas } = useGetElementosTareasPorElemento(elementoId)
  const iniciarMutation = useIniciarTarea()
  const reiniciarMutation = useReiniciarTarea()

  const elemento = elementoRaw?.data
  const tareas = tareasRaw?.data ?? []

  const { data: proyectoRaw } = useGetProyecto(elemento?.proyectoId ?? null)
  const proyecto = proyectoRaw?.data
  // Default permisivo mientras carga el proyecto
  const permitirFisico = proyecto?.permitirRegistroFisico ?? false
  const permitirDigital = proyecto?.permitirRegistroDigital ?? true
  const fisicoPreFirmado = proyecto?.registrosFisicosPreFirmados ?? false
  // Adjuntos: el sheet sólo conoce el flag del proyecto. La planilla puede vetar igual,
  // pero eso lo valida el backend al hacer POST (sale como mensaje de error inline).
  const permiteAdjuntosProyecto = proyecto?.permiteAdjuntos ?? false
  // Descarga de procedimientos: gateada por la config del proyecto. Default false
  // (conservador) hasta que carga el proyecto, así no ofrecemos algo no permitido.
  const permitirDescargarProcedimientos = proyecto?.permitirDescargarProcedimientos ?? false

  async function handleIniciar(tarea: ElementoTarea) {
    const result = await iniciarMutation.mutateAsync(tarea.id) as any
    // El backend devuelve la ET actualizada con registroId — navegamos al form.
    // No llamamos onClose() antes: la navegación desmonta el sheet naturalmente,
    // y conservamos el ?elementoId en la URL para que el back del browser reabra
    // el sheet con el contexto intacto.
    const registroId = result?.data?.registroId ?? result?.registroId
    if (registroId) {
      router.push(`/ejecucion/registros/${registroId}`)
    }
  }

  async function handleReiniciar(tarea: ElementoTarea) {
    await reiniciarMutation.mutateAsync(tarea.id)
  }

  function handleAbrirFormulario(tarea: ElementoTarea) {
    // Hermano cubierto por testpack: no tiene registro propio, abrimos el compartido.
    const rid = tarea.registroId ?? tarea.registroEfectivoId
    if (!rid) return
    router.push(`/ejecucion/registros/${rid}`)
  }

  function handleCargarPdf(tarea: ElementoTarea) {
    if (!tarea.planillaId) return
    router.push(`/checklist/${tarea.planillaId}/${tarea.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto" side="right">
        <SheetHeader className="pb-2">
          {loadingElemento ? (
            <SheetTitle className="text-gray-400">Cargando...</SheetTitle>
          ) : elemento ? (
            <>
              <SheetTitle className="text-lg font-bold text-gray-900">
                <span className="font-mono text-blue-700 mr-2">{elemento.tag}</span>
                {elemento.nombre}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Código #{elemento.codigo} · {elemento.prioridadTexto}
              </SheetDescription>
            </>
          ) : (
            <SheetTitle>Elemento</SheetTitle>
          )}
        </SheetHeader>

        <div className="px-4 pb-8 space-y-6 mt-2">

          {/* Barra de avance */}
          {avance && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <BarraAvance porcentaje={avance.porcentajeAvance} />
              </div>
              <EstadosPopover avance={avance} />
            </div>
          )}

          {/* Datos del elemento */}
          {elemento && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Datos del elemento
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {avance?.elementoTipoNombre        && <DataItem label="Tipo"         value={avance.elementoTipoNombre} />}
                {avance?.elementoTipoEspecialidadNombre  && <DataItem label="Especialidad" value={avance.elementoTipoEspecialidadNombre} />}
                {elemento.pid      && <DataItem label="PID"      value={elemento.pid} />}
                {elemento.testpack && <DataItem label="Testpack" value={elemento.testpack} />}
                {elemento.horasAdicionales > 0 && (
                  <DataItem label="Hs. adicionales" value={String(elemento.horasAdicionales)} />
                )}
                {elemento.observaciones && (
                  <div className="col-span-2">
                    <DataItem label="Observaciones" value={elemento.observaciones} />
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Tareas */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Tareas {!loadingTareas && `(${tareas.length})`}
            </h3>

            {loadingTareas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando tareas...
              </div>
            ) : tareas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No hay tareas asignadas a este elemento.
              </p>
            ) : (
              <div className="space-y-4">
                {agruparPorNivel(tareas).map((g) => (
                  <div key={g.key} className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 px-1">
                      {g.nombre}
                      <span className="ml-1.5 text-gray-400 font-normal">({g.tareas.length})</span>
                    </h4>
                    {g.tareas.map((t) => (
                      <TareaCard
                        key={t.id}
                        tarea={t}
                        onIniciar={handleIniciar}
                        onAbrirFormulario={handleAbrirFormulario}
                        onCargarPdf={handleCargarPdf}
                        onReiniciar={handleReiniciar}
                        isIniciando={iniciarMutation.isPending && iniciarMutation.variables === t.id}
                        isReiniciando={reiniciarMutation.isPending && reiniciarMutation.variables === t.id}
                        permitirFisico={permitirFisico}
                        permitirDigital={permitirDigital}
                        fisicoPreFirmado={fisicoPreFirmado}
                        permiteAdjuntosProyecto={permiteAdjuntosProyecto}
                        permitirDescargarProcedimientos={permitirDescargarProcedimientos}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Card por tarea ─────────────────────────────────────────────────────────

function TareaCard({
  tarea,
  onIniciar,
  onAbrirFormulario,
  onCargarPdf,
  onReiniciar,
  isIniciando,
  isReiniciando,
  permitirFisico,
  permitirDigital,
  fisicoPreFirmado,
  permiteAdjuntosProyecto,
  permitirDescargarProcedimientos,
}: {
  tarea: ElementoTarea
  onIniciar: (t: ElementoTarea) => void
  onAbrirFormulario: (t: ElementoTarea) => void
  onCargarPdf: (t: ElementoTarea) => void
  onReiniciar: (t: ElementoTarea) => Promise<void>
  isIniciando: boolean
  isReiniciando: boolean
  permitirFisico: boolean
  permitirDigital: boolean
  fisicoPreFirmado: boolean
  permiteAdjuntosProyecto: boolean
  permitirDescargarProcedimientos: boolean
}) {
  const [showFirmas, setShowFirmas] = useState(false)
  const [reiniciarOpen, setReiniciarOpen] = useState(false)
  // Mostramos firmas siempre que haya slots configurados, sea digital o físico. Los pre-firmados
  // y los registros sin firma requerida tienen firmasTotal === 0, así que quedan excluidos.
  const tieneFirmas = !!tarea.registroId && tarea.firmasTotal > 0
  // Adjuntar archivo a la tarea (al registro asociado). El hook necesita un string
  // no-nullable; usamos "" cuando no hay registro todavía (la opción no se muestra).
  const adjuntoInputRef = useRef<HTMLInputElement>(null)
  const uploadAdjunto = useUploadRegistroArchivo(tarea.registroId ?? "")
  const [adjuntoError, setAdjuntoError] = useState<string | null>(null)
  const [adjuntoOk, setAdjuntoOk] = useState<string | null>(null)

  // Descargar procedimiento (abre el PDF en pestaña nueva). El hook hace fetch del SAS URL
  // con la auth del usuario y abre el resultado. Errores van al state inline.
  const downloadProcedimiento = useDownloadProcedimiento()
  const [procedimientoError, setProcedimientoError] = useState<string | null>(null)
  async function handleDescargarProcedimiento() {
    if (!tarea.procedimientoId) return
    setProcedimientoError(null)
    try {
      await downloadProcedimiento.mutateAsync(tarea.procedimientoId)
    } catch (err) {
      setProcedimientoError((err as Error).message ?? "No se pudo descargar el procedimiento.")
    }
  }

  async function handleAdjuntoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !tarea.registroId) return
    setAdjuntoError(null)
    setAdjuntoOk(null)
    try {
      await uploadAdjunto.mutateAsync(file)
      setAdjuntoOk(`"${file.name}" adjuntado.`)
      setTimeout(() => setAdjuntoOk(null), 3000)
    } catch (err) {
      setAdjuntoError((err as Error).message ?? "No se pudo adjuntar.")
    }
  }

  const puedeAdjuntar = !!tarea.registroId && permiteAdjuntosProyecto && tarea.estado !== 5

  const items = buildTareaMenuItems({
    tarea,
    onIniciar,
    onAbrirFormulario,
    onCargarPdf,
    onAdjuntarArchivo: () => adjuntoInputRef.current?.click(),
    onDescargarProcedimiento: handleDescargarProcedimiento,
    onRequestReiniciar: () => setReiniciarOpen(true),
    isIniciando,
    isReiniciando,
    showFirmas,
    onToggleFirmas: () => setShowFirmas((s) => !s),
    permitirFisico,
    permitirDigital,
    fisicoPreFirmado,
    puedeAdjuntar,
    adjuntandoPending: uploadAdjunto.isPending,
    descargandoProcedimientoPending: downloadProcedimiento.isPending,
    permitirDescargarProcedimientos,
  })

  const busy = isIniciando || uploadAdjunto.isPending || downloadProcedimiento.isPending

  async function handleConfirmReiniciar() {
    try {
      await onReiniciar(tarea)
      setReiniciarOpen(false)
    } catch {
      // Mantener abierto si falla
    }
  }

  return (
    <div className="rounded-lg border bg-white p-3 space-y-2">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{tarea.codigo}</span>
            {tarea.esCritica && (
              <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium">
                <AlertCircle className="h-3 w-3" /> Crítica
              </span>
            )}
          </div>
          <p className="font-medium text-sm text-gray-900">{tarea.tareaNombre}</p>
          {tarea.esTestpackPropagado && (
            <span className="inline-flex items-center gap-1 text-[11px] text-violet-700 bg-violet-50 rounded px-1.5 py-0.5 font-medium w-fit">
              <Paperclip className="h-3 w-3" /> Completado vía testpack
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <EstadoBadge tarea={tarea} />
          {items.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-gray-500"
                    disabled={busy}
                    aria-label="Acciones"
                  />
                }
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                {items.map((item, i) =>
                  item.kind === "separator" ? (
                    <DropdownMenuSeparator key={`sep-${i}`} />
                  ) : (
                    <DropdownMenuItem
                      key={item.label}
                      onClick={item.onSelect}
                      disabled={item.disabled}
                      variant={item.variant}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <TareaMeta tarea={tarea} />

      {tarea.motivoRechazo && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          Motivo rechazo: {tarea.motivoRechazo}
        </p>
      )}

      {adjuntoError && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          {adjuntoError}
        </p>
      )}
      {procedimientoError && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          {procedimientoError}
        </p>
      )}
      {adjuntoOk && (
        <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
          {adjuntoOk}
        </p>
      )}

      <input
        ref={adjuntoInputRef}
        type="file"
        hidden
        onChange={handleAdjuntoFileSelected}
      />

      {tieneFirmas && showFirmas && tarea.registroId && (
        <div className="pt-1">
          <FirmaPanel registroId={tarea.registroId} />
        </div>
      )}

      <AlertDialog open={reiniciarOpen} onOpenChange={setReiniciarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tarea.esTestpackPropagado ? "¿Quitar del testpack?" : "¿Reiniciar tarea?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tarea.esTestpackPropagado ? (
                <>
                  Esta tarea fue completada como parte de un testpack. Se desvinculará del
                  grupo y volverá a <strong>PENDIENTE</strong>; el registro del grupo y los
                  demás elementos no se modifican.
                </>
              ) : (
                <>
                  Se descartará el registro actual y todos los valores cargados
                  {tarea.estado === 3 ? " (incluyendo firmas si las hay)" : ""}.
                  La tarea volverá al estado <strong>PENDIENTE</strong> y deberás iniciarla de nuevo.
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReiniciando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmReiniciar}
              disabled={isReiniciando}
            >
              {isReiniciando ? "Reiniciando..." : "Reiniciar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Construcción de items del menú según estado ─────────────────────────────

type LucideIcon = ComponentType<{ className?: string }>
type MenuItem =
  | { kind: "separator" }
  | {
      kind: "item"
      label: string
      icon: LucideIcon
      onSelect: () => void
      disabled?: boolean
      variant?: "default" | "destructive"
    }

function buildTareaMenuItems({
  tarea,
  onIniciar,
  onAbrirFormulario,
  onCargarPdf,
  onAdjuntarArchivo,
  onRequestReiniciar,
  isIniciando,
  isReiniciando,
  showFirmas,
  onToggleFirmas,
  permitirFisico,
  permitirDigital,
  fisicoPreFirmado,
  puedeAdjuntar,
  adjuntandoPending,
  onDescargarProcedimiento,
  descargandoProcedimientoPending,
  permitirDescargarProcedimientos,
}: {
  tarea: ElementoTarea
  onIniciar: (t: ElementoTarea) => void
  onAbrirFormulario: (t: ElementoTarea) => void
  onCargarPdf: (t: ElementoTarea) => void
  onAdjuntarArchivo: () => void
  onDescargarProcedimiento: () => void
  onRequestReiniciar: () => void
  isIniciando: boolean
  isReiniciando: boolean
  showFirmas: boolean
  onToggleFirmas: () => void
  permitirFisico: boolean
  permitirDigital: boolean
  fisicoPreFirmado: boolean
  puedeAdjuntar: boolean
  adjuntandoPending: boolean
  descargandoProcedimientoPending: boolean
  permitirDescargarProcedimientos: boolean
}): MenuItem[] {
  const items: MenuItem[] = []
  // Mostramos firmas siempre que haya slots configurados, sea digital o físico. Los pre-firmados
  // y los registros sin firma requerida tienen firmasTotal === 0, así que quedan excluidos.
  const tieneFirmas = !!tarea.registroId && tarea.firmasTotal > 0
  const cargarRegistroLabel = fisicoPreFirmado ? "Cargar registro firmado" : "Cargar registro"

  // Hermano cubierto por testpack: no tiene registro propio (la carga y la firma se
  // gestionan desde el elemento líder). Sólo ofrecemos ver/descargar el registro
  // compartido y, si no es inmutable, "quitar del testpack" (lo desvincula del grupo).
  if (tarea.esTestpackPropagado && tarea.registroEfectivoId) {
    const rid = tarea.registroEfectivoId
    if (tarea.esFisico) {
      items.push({ kind: "item", label: "Descargar PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${rid}/pdf`) })
      items.push({ kind: "item", label: "Ver registro / adjuntos", icon: FileText, onSelect: () => onAbrirFormulario(tarea) })
    } else {
      items.push({ kind: "item", label: "Ver registro", icon: FileText, onSelect: () => onAbrirFormulario(tarea) })
      items.push({ kind: "item", label: "Descargar PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${rid}/pdf`) })
    }
    // Reiniciar un hermano cubierto sólo lo saca del grupo (no toca el registro líder).
    // El backend lo permite en COMPLETADO/RECHAZADO; FIRMADO/APROBADO son inmutables.
    if (tarea.estado === 3 || tarea.estado === 5) {
      items.push({ kind: "separator" })
      items.push({
        kind: "item",
        label: "Quitar del testpack",
        icon: RotateCcw,
        onSelect: onRequestReiniciar,
        disabled: isReiniciando,
        variant: "destructive",
      })
    }
    return items
  }

  // Acciones primarias por estado
  switch (tarea.estado) {
    case 1: // PENDIENTE
      if (permitirDigital) {
        items.push({
          kind: "item",
          label: "Iniciar tarea",
          icon: Play,
          onSelect: () => onIniciar(tarea),
          disabled: isIniciando,
        })
      }
      if (tarea.planillaId && permitirFisico) {
        items.push({
          kind: "item",
          label: cargarRegistroLabel,
          icon: Upload,
          onSelect: () => onCargarPdf(tarea),
          disabled: isIniciando,
        })
      }
      break
    case 2: // EN_PROCESO
      if (tarea.registroId) {
        if (tarea.esFisico) {
          items.push({ kind: "item", label: "Descargar PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`) })
        } else if (permitirDigital) {
          items.push({ kind: "item", label: "Completar formulario", icon: FileText, onSelect: () => onAbrirFormulario(tarea) })
        }
        if (tarea.planillaId && permitirFisico) {
          items.push({ kind: "item", label: cargarRegistroLabel, icon: Upload, onSelect: () => onCargarPdf(tarea) })
        }
      }
      break
    case 3: // COMPLETADO — firmas son independientes, el "Ver y firmar" siempre disponible
      if (tarea.registroId) {
        items.push(
          tarea.esFisico
            ? { kind: "item", label: "Descargar PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`) }
            : { kind: "item", label: "Ver y firmar", icon: FileText, onSelect: () => onAbrirFormulario(tarea) }
        )
      }
      break
    case 4: // APROBADO
    case 7: // FIRMADO
      if (tarea.registroId) {
        items.push(
          tarea.esFisico
            ? { kind: "item", label: "Descargar PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`) }
            : { kind: "item", label: "Ver registro", icon: FileText, onSelect: () => onAbrirFormulario(tarea) }
        )
      }
      break
    case 5: // RECHAZADO
      if (tarea.registroId) {
        if (tarea.esFisico) {
          items.push({ kind: "item", label: "Descargar PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`) })
        } else if (permitirDigital) {
          items.push({ kind: "item", label: "Revisar y re-completar", icon: FileText, onSelect: () => onAbrirFormulario(tarea), variant: "destructive" })
        }
        if (tarea.planillaId && permitirFisico) {
          items.push({ kind: "item", label: cargarRegistroLabel, icon: Upload, onSelect: () => onCargarPdf(tarea), variant: "destructive" })
        }
      }
      break
  }

  // Descargar procedimiento — disponible cuando: el proyecto habilita la descarga de
  // procedimientos, la tarea tiene un procedimiento asignado y ese procedimiento tiene
  // archivo cargado. El backend valida que el usuario tenga acceso al proyecto (rol
  // asignado) antes de devolver el SAS URL.
  if (permitirDescargarProcedimientos && tarea.procedimientoId && tarea.procedimientoTieneArchivo) {
    items.push({
      kind: "item",
      label: "Descargar procedimiento",
      icon: BookOpen,
      onSelect: onDescargarProcedimiento,
      disabled: descargandoProcedimientoPending,
    })
  }

  // Descargar PDF — para registros DIGITALES con datos cargados (COMPLETADO, RECHAZADO,
  // FIRMADO). El backend arma el PDF con el diseño de la planilla y los valores guardados.
  // Para físicos la opción equivalente es "Descargar registro" (devuelve el escaneo original).
  const puedeDescargarPdfDigital =
    !tarea.esFisico &&
    !!tarea.registroId &&
    (tarea.estado === 3 || tarea.estado === 5 || tarea.estado === 7)
  if (puedeDescargarPdfDigital) {
    items.push({
      kind: "item",
      label: "Descargar PDF",
      icon: FileDown,
      onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`),
    })
  }

  // Adjuntar archivo (atajo directo). Backend valida también que la planilla acepte adjuntos;
  // si no, devuelve error que se muestra inline en la card.
  if (puedeAdjuntar) {
    items.push({
      kind: "item",
      label: "Adjuntar archivo",
      icon: Paperclip,
      onSelect: onAdjuntarArchivo,
      disabled: adjuntandoPending,
    })
  }

  // Acceso a la página del registro para físicos. En digital ya hay "Completar formulario" /
  // "Ver y firmar" / "Ver registro" según estado; para físico solo había "Descargar registro",
  // sin forma de llegar a la pantalla donde se gestionan adjuntos. Lo agregamos siempre que
  // haya registro físico.
  if (tarea.registroId && tarea.esFisico) {
    items.push({
      kind: "item",
      label: "Ver registro / adjuntos",
      icon: FileText,
      onSelect: () => onAbrirFormulario(tarea),
    })
  }

  // Planilla en blanco — sólo útil cuando el proyecto acepta registros físicos
  // (la idea es imprimir, completar a mano y subir el escaneo). En proyectos digitales
  // no aporta valor: el usuario completa el formulario online.
  if (tarea.planillaId && permitirFisico) {
    if (items.length > 0) items.push({ kind: "separator" })
    const urlDescarga = `/api/planillas/${tarea.planillaId}/pdf/blanco/${tarea.id}`
    const urlPreview = `/api/planillas/${tarea.planillaId}/pdf/blanco/${tarea.id}/preview`
    items.push({ kind: "item", label: "Descargar planilla", icon: Download, onSelect: () => triggerDownload(urlDescarga) })
    items.push({ kind: "item", label: "Vista previa", icon: Eye, onSelect: () => window.open(urlPreview, "_blank", "noreferrer") })
  }

  // Firmas (digital o físico, mientras haya slots configurados)
  if (tieneFirmas) {
    if (items.length > 0) items.push({ kind: "separator" })
    items.push({
      kind: "item",
      label: showFirmas ? "Ocultar firmas" : "Ver firmas",
      icon: PenLine,
      onSelect: onToggleFirmas,
    })
  }

  // Reiniciar tarea: descarta el registro y vuelve a PENDIENTE.
  // Disponible cuando hay registro abierto o cerrado-no-final (EN_PROCESO, COMPLETADO, RECHAZADO).
  const puedeReiniciar = tarea.estado === 2 || tarea.estado === 3 || tarea.estado === 5
  if (puedeReiniciar) {
    if (items.length > 0) items.push({ kind: "separator" })
    items.push({
      kind: "item",
      label: "Reiniciar tarea",
      icon: RotateCcw,
      onSelect: onRequestReiniciar,
      disabled: isReiniciando,
      variant: "destructive",
    })
  }

  return items
}

function triggerDownload(url: string) {
  const a = document.createElement("a")
  a.href = url
  a.target = "_blank"
  a.rel = "noreferrer"
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}


// ─── helpers ────────────────────────────────────────────────────────────────

function TareaMeta({ tarea }: { tarea: ElementoTarea }) {
  const fecha = fechaRelevante(tarea)
  // En "Firmado físico" (estado 4) no hay firma digital atribuible al usuario asignado;
  // el operador puede ser distinto al firmante del papel, así que ocultamos el campo.
  const mostrarAsignado = tarea.asignadoNombre && tarea.estado !== 4
  // Solo mostramos el badge de origen cuando la fecha mostrada ES la planificada — para
  // fechas reales (inicio/fin) no aplica el concepto.
  const mostrarOrigenBadge = fecha?.label === "Planif." && tarea.fechaPlanificada
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
      {mostrarAsignado && (
        <span>Asignado: <span className="font-medium text-gray-700">{tarea.asignadoNombre}</span></span>
      )}
      {fecha && (
        <span className="inline-flex items-center gap-1.5">
          {fecha.label}: <span className="font-medium text-gray-700">{formatFecha(fecha.value)}</span>
          {mostrarOrigenBadge && (
            tarea.fechaPlanificadaOrigen === 1 ? (
              <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded font-medium" title="Esta fecha fue asignada por el generador automático. Editarla la convierte en Manual.">
                Generada
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded font-medium" title="Esta fecha la cargó un usuario manualmente. El generador no la modificará mientras esté en el futuro.">
                Manual
              </span>
            )
          )}
        </span>
      )}
      {tarea.horasEstimadas != null && (
        <span>Hs. est.: <span className="font-medium text-gray-700">{tarea.horasEstimadas}</span></span>
      )}
    </div>
  )
}

interface GrupoNivel {
  key: string
  nombre: string
  posicion: number
  tareas: ElementoTarea[]
}

function agruparPorNivel(tareas: ElementoTarea[]): GrupoNivel[] {
  const map = new Map<string, GrupoNivel>()
  for (const t of tareas) {
    const key = t.nivelId ?? "__sin-nivel__"
    let grupo = map.get(key)
    if (!grupo) {
      grupo = {
        key,
        nombre: t.nivelNombre ?? "Sin nivel",
        // Sin nivel al final
        posicion: t.nivelPosicion ?? Number.MAX_SAFE_INTEGER,
        tareas: [],
      }
      map.set(key, grupo)
    }
    grupo.tareas.push(t)
  }
  return Array.from(map.values()).sort((a, b) => a.posicion - b.posicion)
}

function fechaRelevante(t: ElementoTarea): { label: string; value: string } | null {
  // 1=PENDIENTE → planif.; 2=EN_PROCESO → inicio; 3,4,5,7=completado/aprobado/rechazado/firmado → fin; 6=CANCELADO → fin
  if (t.estado === 1 && t.fechaPlanificada) return { label: "Planif.", value: t.fechaPlanificada }
  if (t.estado === 2 && t.fechaInicio)      return { label: "Inicio",  value: t.fechaInicio }
  if (t.fechaFinalizacion)                  return { label: "Fin",     value: t.fechaFinalizacion }
  if (t.fechaInicio)                        return { label: "Inicio",  value: t.fechaInicio }
  if (t.fechaPlanificada)                   return { label: "Planif.", value: t.fechaPlanificada }
  return null
}

const ESTADO_ICONS: Record<number, React.ReactNode> = {
  1: <Clock className="h-3.5 w-3.5" />,
  2: <Loader2 className="h-3.5 w-3.5" />,
  3: <CheckCircle2 className="h-3.5 w-3.5" />,
  4: <CheckCircle2 className="h-3.5 w-3.5" />,
  5: <XCircle className="h-3.5 w-3.5" />,
  6: <Ban className="h-3.5 w-3.5" />,
  7: <CheckCircle2 className="h-3.5 w-3.5" />,
}

const ESTADO_STYLES: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-teal-100 text-teal-700",   // "Firmado físico" — PDF en papel
  5: "bg-red-100 text-red-700",
  6: "bg-gray-50 text-gray-400",
  7: "bg-emerald-100 text-emerald-700", // "Firmado" — digitalmente
}

function EstadoBadge({ tarea }: { tarea: ElementoTarea }) {
  const { estado } = tarea
  // El backend manda estadoTexto como el nombre crudo del enum (ej. "APROBADO"). En la UI
  // usamos la etiqueta local de ESTADO_ELEMENTO_TAREA para tener control del wording.
  const estadoTexto = ESTADO_ELEMENTO_TAREA[estado as keyof typeof ESTADO_ELEMENTO_TAREA] ?? tarea.estadoTexto

  // Cuando el registro está COMPLETADO (3) y existe configuración de firmas, ajustamos
  // el texto según el contexto del usuario actual: si te falta firmar, lo pedimos;
  // si ya firmaste, indicamos que se espera a otros; si no sos firmante, mostramos genérico.
  if (estado === 3 && tarea.firmasTotal > 0) {
    if (tarea.usuarioPuedeFirmar) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap bg-amber-100 text-amber-800">
          <Clock className="h-3.5 w-3.5" />
          Esperando tu firma
        </span>
      )
    }
    if (tarea.usuarioYaFirmo) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Esperando otras firmas
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap bg-yellow-100 text-yellow-700">
        <Clock className="h-3.5 w-3.5" />
        Pendiente de firmas
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${ESTADO_STYLES[estado] ?? "bg-gray-100 text-gray-700"}`}>
      {ESTADO_ICONS[estado]}
      {estadoTexto}
    </span>
  )
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  )
}
