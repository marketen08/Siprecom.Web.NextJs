"use client"

import { useRef, useState, type ComponentType } from "react"
import {
  AlertCircle, Clock, CheckCircle2, XCircle, Ban, BookOpen,
  Loader2, Play, FileText, Upload, Download, Eye, FileDown,
  Link2, MoreVertical, Paperclip, PenLine, RotateCcw, ClipboardCheck,
} from "lucide-react"

import { ESTADO_ELEMENTO_TAREA, type ElementoTarea } from "@/features/elementos-tareas/types"
import { useUploadRegistroArchivo } from "@/features/registros/api/use-registro-archivos"
import { useDownloadProcedimiento } from "@/features/procedimientos/api/use-download-procedimiento"
import { useMarcarCompletadaSinRegistro } from "@/features/elementos-tareas/api/use-marcar-completada-sin-registro"
import { FirmaPanel } from "@/features/registros/components/firma-panel"
import { DependenciasSheet } from "@/features/elementos-tareas/components/dependencias-sheet"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

// ─── Card ────────────────────────────────────────────────────────────────────

interface TareaCardProps {
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
  /** Habilita la acción "Marcar completada sin registro". Viene del proyecto. */
  permitirAvanceSinRegistro: boolean
  canWrite: boolean
  /** Prefijo opcional para mostrar arriba del código (ej. "Ciclo #3"). */
  prefijoContexto?: string
}

export function TareaCard({
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
  permitirAvanceSinRegistro,
  canWrite,
  prefijoContexto,
}: TareaCardProps) {
  const [showFirmas, setShowFirmas] = useState(false)
  const [reiniciarOpen, setReiniciarOpen] = useState(false)
  const [dependenciasOpen, setDependenciasOpen] = useState(false)
  // Dialog para "Marcar completada sin registro" — solo si el proyecto permite.
  const [marcarSinRegistroOpen, setMarcarSinRegistroOpen] = useState(false)
  const [observacionSinRegistro, setObservacionSinRegistro] = useState("")
  const [errorSinRegistro, setErrorSinRegistro] = useState<string | null>(null)
  const marcarSinRegistroMutation = useMarcarCompletadaSinRegistro()
  const tieneFirmas = !!tarea.registroId && tarea.firmasTotal > 0
  const adjuntoInputRef = useRef<HTMLInputElement>(null)
  const uploadAdjunto = useUploadRegistroArchivo(tarea.registroId ?? "")
  const [adjuntoError, setAdjuntoError] = useState<string | null>(null)
  const [adjuntoOk, setAdjuntoOk] = useState<string | null>(null)

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
    onAbrirDependencias: () => setDependenciasOpen(true),
    onMarcarSinRegistro: () => {
      setObservacionSinRegistro("")
      setErrorSinRegistro(null)
      setMarcarSinRegistroOpen(true)
    },
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
    permitirAvanceSinRegistro,
    canWrite,
  })

  const busy = isIniciando || uploadAdjunto.isPending || downloadProcedimiento.isPending || marcarSinRegistroMutation.isPending

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
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{tarea.codigo}</span>
            {prefijoContexto && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                {prefijoContexto}
              </span>
            )}
            {tarea.esCritica && (
              <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium">
                <AlertCircle className="h-3 w-3" /> Crítica
              </span>
            )}
          </div>
          <p className="font-medium text-sm text-gray-900">{tarea.tareaNombre}</p>
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
            <AlertDialogTitle>¿Reiniciar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Se descartará el registro actual y todos los valores cargados
              {tarea.estado === 3 ? " (incluyendo firmas si las hay)" : ""}.
              La tarea volverá al estado <strong>PENDIENTE</strong> y deberás iniciarla de nuevo.
              Esta acción no se puede deshacer.
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

      <DependenciasSheet
        open={dependenciasOpen}
        onClose={() => setDependenciasOpen(false)}
        elementoTareaId={tarea.id}
        elementoTag={tarea.elementoTag}
        tareaNombre={tarea.tareaNombre}
        elementoId={tarea.elementoId}
      />

      <AlertDialog open={marcarSinRegistroOpen} onOpenChange={(v) => {
        if (!marcarSinRegistroMutation.isPending) setMarcarSinRegistroOpen(v)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar tarea como completada sin registro?</AlertDialogTitle>
            <AlertDialogDescription>
              La tarea pasará a <strong>completada</strong> sin cargar planilla
              (física ni digital). Se aplicará la configuración de firmas del
              proyecto: si tenés rol de firma y firma guardada en tu perfil, se
              auto-firmarán los slots correspondientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-gray-700">
              Motivo / observación <span className="text-xs text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              value={observacionSinRegistro}
              onChange={(e) => setObservacionSinRegistro(e.target.value)}
              placeholder="Ej: verificación visual sin planilla asociada."
              rows={3}
              disabled={marcarSinRegistroMutation.isPending}
            />
            {errorSinRegistro && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 whitespace-pre-line">
                {errorSinRegistro}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={marcarSinRegistroMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                setErrorSinRegistro(null)
                try {
                  await marcarSinRegistroMutation.mutateAsync({
                    elementoTareaId: tarea.id,
                    observacion: observacionSinRegistro.trim() || null,
                  })
                  setMarcarSinRegistroOpen(false)
                } catch (err) {
                  setErrorSinRegistro((err as Error).message ?? "No se pudo marcar la tarea.")
                }
              }}
              disabled={marcarSinRegistroMutation.isPending}
            >
              {marcarSinRegistroMutation.isPending ? "Marcando..." : "Marcar completada"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Menu builder ────────────────────────────────────────────────────────────

type LucideIcon = ComponentType<{ className?: string }>
export type MenuItem =
  | { kind: "separator" }
  | {
      kind: "item"
      label: string
      icon: LucideIcon
      onSelect: () => void
      disabled?: boolean
      variant?: "default" | "destructive"
    }

export function buildTareaMenuItems({
  tarea,
  onIniciar,
  onAbrirFormulario,
  onCargarPdf,
  onAdjuntarArchivo,
  onRequestReiniciar,
  onAbrirDependencias,
  onMarcarSinRegistro,
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
  permitirAvanceSinRegistro,
  canWrite,
}: {
  tarea: ElementoTarea
  onIniciar: (t: ElementoTarea) => void
  onAbrirFormulario: (t: ElementoTarea) => void
  onCargarPdf: (t: ElementoTarea) => void
  onAdjuntarArchivo: () => void
  onDescargarProcedimiento: () => void
  onRequestReiniciar: () => void
  onAbrirDependencias: () => void
  onMarcarSinRegistro: () => void
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
  permitirAvanceSinRegistro: boolean
  canWrite: boolean
}): MenuItem[] {
  const items: MenuItem[] = []
  const tieneFirmas = !!tarea.registroId && tarea.firmasTotal > 0
  const cargarRegistroLabel = fisicoPreFirmado ? "Cargar registro firmado" : "Cargar registro"

  if (tarea.registroId && tarea.esFisico) {
    items.push({
      kind: "item",
      label: "Ver registro / adjuntos",
      icon: FileText,
      onSelect: () => onAbrirFormulario(tarea),
    })
  }

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
      // "Marcar completada sin registro" — solo desde PENDIENTE. Salta el carga
      // digital/física; las firmas del proyecto siguen aplicando.
      if (permitirAvanceSinRegistro) {
        items.push({
          kind: "item",
          label: "Marcar completada sin registro",
          icon: ClipboardCheck,
          onSelect: onMarcarSinRegistro,
          disabled: isIniciando,
        })
      }
      break
    case 2: // EN_PROCESO
      if (tarea.registroId) {
        if (tarea.esFisico) {
          items.push({ kind: "item", label: "Descargar registro PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`) })
        } else if (permitirDigital) {
          items.push({ kind: "item", label: "Completar formulario", icon: FileText, onSelect: () => onAbrirFormulario(tarea) })
        }
        if (tarea.planillaId && permitirFisico) {
          items.push({ kind: "item", label: cargarRegistroLabel, icon: Upload, onSelect: () => onCargarPdf(tarea) })
        }
      }
      break
    case 3: // COMPLETADO
      if (tarea.registroId) {
        items.push(
          tarea.esFisico
            ? { kind: "item", label: "Descargar registro PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`) }
            : { kind: "item", label: "Ver y firmar", icon: FileText, onSelect: () => onAbrirFormulario(tarea) }
        )
      }
      break
    case 4:
    case 7:
      if (tarea.registroId) {
        items.push(
          tarea.esFisico
            ? { kind: "item", label: "Descargar registro PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`) }
            : { kind: "item", label: "Ver registro", icon: FileText, onSelect: () => onAbrirFormulario(tarea) }
        )
      }
      break
    case 5:
      if (tarea.registroId) {
        if (tarea.esFisico) {
          items.push({ kind: "item", label: "Descargar registro PDF", icon: FileDown, onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`) })
        } else if (permitirDigital) {
          items.push({ kind: "item", label: "Revisar y re-completar", icon: FileText, onSelect: () => onAbrirFormulario(tarea), variant: "destructive" })
        }
        if (tarea.planillaId && permitirFisico) {
          items.push({ kind: "item", label: cargarRegistroLabel, icon: Upload, onSelect: () => onCargarPdf(tarea), variant: "destructive" })
        }
      }
      break
  }

  const puedeDescargarPdfDigital =
    !tarea.esFisico &&
    !!tarea.registroId &&
    (tarea.estado === 3 || tarea.estado === 5 || tarea.estado === 7)
  if (puedeDescargarPdfDigital) {
    items.push({
      kind: "item",
      label: "Descargar registro PDF",
      icon: FileDown,
      onSelect: () => triggerDownload(`/api/registros/${tarea.registroId}/pdf`),
    })
  }

  if (puedeAdjuntar) {
    items.push({
      kind: "item",
      label: "Adjuntar archivo",
      icon: Paperclip,
      onSelect: onAdjuntarArchivo,
      disabled: adjuntandoPending,
    })
  }

  const puedeDescargarPlanilla = !!tarea.planillaId && permitirFisico
  const puedeDescargarProcedimiento =
    permitirDescargarProcedimientos
    && !!tarea.procedimientoId
    && tarea.procedimientoTieneArchivo
  if (puedeDescargarPlanilla || puedeDescargarProcedimiento) {
    if (items.length > 0) items.push({ kind: "separator" })
    if (puedeDescargarPlanilla) {
      const urlDescarga = `/api/planillas/${tarea.planillaId}/pdf/blanco/${tarea.id}`
      const urlPreview = `/api/planillas/${tarea.planillaId}/pdf/blanco/${tarea.id}/preview`
      items.push({ kind: "item", label: "Descargar planilla PDF", icon: Download, onSelect: () => triggerDownload(urlDescarga) })
      items.push({ kind: "item", label: "Ver planilla PDF", icon: Eye, onSelect: () => window.open(urlPreview, "_blank", "noreferrer") })
    }
    if (puedeDescargarProcedimiento) {
      items.push({
        kind: "item",
        label: "Ver procedimiento",
        icon: BookOpen,
        onSelect: onDescargarProcedimiento,
        disabled: descargandoProcedimientoPending,
      })
    }
  }

  if (tieneFirmas) {
    if (items.length > 0) items.push({ kind: "separator" })
    items.push({
      kind: "item",
      label: showFirmas ? "Ocultar firmas" : "Ver firmas",
      icon: PenLine,
      onSelect: onToggleFirmas,
    })
  }

  if (items.length > 0) items.push({ kind: "separator" })
  items.push({
    kind: "item",
    label: "Dependencias",
    icon: Link2,
    onSelect: onAbrirDependencias,
  })

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

  if (!canWrite) {
    const escrituraPura = new Set([
      "Iniciar tarea",
      "Cargar registro",
      "Cargar registro firmado",
      "Adjuntar archivo",
      "Reiniciar tarea",
      "Marcar completada sin registro",
    ])
    const renombrar: Record<string, string> = {
      "Completar formulario": "Ver formulario",
      "Ver y firmar": "Ver registro",
      "Revisar y re-completar": "Ver registro",
    }
    const out = items
      .filter(item => item.kind === "separator" || !escrituraPura.has(item.label))
      .map(item => {
        if (item.kind !== "item") return item
        const nuevo = renombrar[item.label]
        return nuevo ? { ...item, label: nuevo, variant: "default" as const } : item
      })
    const collapsed: MenuItem[] = []
    for (const it of out) {
      if (it.kind === "separator") {
        if (collapsed.length === 0) continue
        if (collapsed[collapsed.length - 1].kind === "separator") continue
      }
      collapsed.push(it)
    }
    while (collapsed.length > 0 && collapsed[collapsed.length - 1].kind === "separator") {
      collapsed.pop()
    }
    return collapsed
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

// ─── Sub-componentes visuales ────────────────────────────────────────────────

function TareaMeta({ tarea }: { tarea: ElementoTarea }) {
  const fecha = fechaRelevante(tarea)
  const mostrarAsignado = tarea.asignadoNombre && tarea.estado !== 4
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
              <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded font-medium" title="Fecha asignada por el generador automático.">
                Generada
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded font-medium" title="Fecha cargada manualmente.">
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

function fechaRelevante(t: ElementoTarea): { label: string; value: string } | null {
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
  4: "bg-teal-100 text-teal-700",
  5: "bg-red-100 text-red-700",
  6: "bg-gray-50 text-gray-400",
  7: "bg-emerald-100 text-emerald-700",
}

export function EstadoBadge({ tarea }: { tarea: ElementoTarea }) {
  const { estado } = tarea
  const estadoTexto = ESTADO_ELEMENTO_TAREA[estado as keyof typeof ESTADO_ELEMENTO_TAREA] ?? tarea.estadoTexto

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
