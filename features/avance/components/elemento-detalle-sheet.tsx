"use client"

import { useRef, useState, type ComponentType } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetElementosTareasPorElemento } from "@/features/elementos-tareas/api/use-get-elementostareas-por-elemento"
import { useIniciarTarea } from "@/features/elementos-tareas/api/use-iniciar-tarea"
import { useReiniciarTarea } from "@/features/elementos-tareas/api/use-reiniciar-tarea"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useUploadRegistroArchivo } from "@/features/registros/api/use-registro-archivos"
import { apiClient } from "@/lib/api-client"
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
  AlertCircle, Clock, CheckCircle2, XCircle, Ban,
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

// ─── Tipo archivo ─────────────────────────────────────────────────────────────

interface RegistroArchivo {
  id: string
  nombreArchivo: string
  contentType: string
  tamanioBytes: number
  url: string
  urlExpiraEn: string
}

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

  async function handleIniciar(tarea: ElementoTarea) {
    const result = await iniciarMutation.mutateAsync(tarea.id) as any
    // El backend devuelve la ET actualizada con registroId — navegamos al form
    const registroId = result?.data?.registroId ?? result?.registroId
    if (registroId) {
      onClose()
      router.push(`/ejecucion/registros/${registroId}`)
    }
  }

  async function handleReiniciar(tarea: ElementoTarea) {
    await reiniciarMutation.mutateAsync(tarea.id)
  }

  function handleAbrirFormulario(tarea: ElementoTarea) {
    if (!tarea.registroId) return
    onClose()
    router.push(`/ejecucion/registros/${tarea.registroId}`)
  }

  function handleCargarPdf(tarea: ElementoTarea) {
    if (!tarea.planillaId) return
    onClose()
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
                {avance?.elementoTipoEspecialidad  && <DataItem label="Especialidad" value={avance.elementoTipoEspecialidad} />}
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
}) {
  const [showFirmas, setShowFirmas] = useState(false)
  const [reiniciarOpen, setReiniciarOpen] = useState(false)
  const tieneFirmas = tarea.esFisico && !!tarea.registroId
  const archivoFisico = useArchivoFisico(tarea.esFisico ? tarea.registroId : null)

  // Adjuntar archivo a la tarea (al registro asociado). El hook necesita un string
  // no-nullable; usamos "" cuando no hay registro todavía (la opción no se muestra).
  const adjuntoInputRef = useRef<HTMLInputElement>(null)
  const uploadAdjunto = useUploadRegistroArchivo(tarea.registroId ?? "")
  const [adjuntoError, setAdjuntoError] = useState<string | null>(null)
  const [adjuntoOk, setAdjuntoOk] = useState<string | null>(null)

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
    onRequestReiniciar: () => setReiniciarOpen(true),
    isIniciando,
    isReiniciando,
    archivoFisico,
    showFirmas,
    onToggleFirmas: () => setShowFirmas((s) => !s),
    permitirFisico,
    permitirDigital,
    fisicoPreFirmado,
    puedeAdjuntar,
    adjuntandoPending: uploadAdjunto.isPending,
  })

  const busy = isIniciando || archivoFisico.isLoading || uploadAdjunto.isPending

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
  archivoFisico,
  showFirmas,
  onToggleFirmas,
  permitirFisico,
  permitirDigital,
  fisicoPreFirmado,
  puedeAdjuntar,
  adjuntandoPending,
}: {
  tarea: ElementoTarea
  onIniciar: (t: ElementoTarea) => void
  onAbrirFormulario: (t: ElementoTarea) => void
  onCargarPdf: (t: ElementoTarea) => void
  onAdjuntarArchivo: () => void
  onRequestReiniciar: () => void
  isIniciando: boolean
  isReiniciando: boolean
  archivoFisico: { abrir: () => Promise<void>; isLoading: boolean }
  showFirmas: boolean
  onToggleFirmas: () => void
  permitirFisico: boolean
  permitirDigital: boolean
  fisicoPreFirmado: boolean
  puedeAdjuntar: boolean
  adjuntandoPending: boolean
}): MenuItem[] {
  const items: MenuItem[] = []
  const tieneFirmas = tarea.esFisico && !!tarea.registroId
  const cargarRegistroLabel = fisicoPreFirmado ? "Cargar registro firmado" : "Cargar registro"

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
          items.push({ kind: "item", label: "Descargar registro", icon: FileDown, onSelect: () => archivoFisico.abrir(), disabled: archivoFisico.isLoading })
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
            ? { kind: "item", label: "Descargar registro", icon: FileDown, onSelect: () => archivoFisico.abrir(), disabled: archivoFisico.isLoading }
            : { kind: "item", label: "Ver y firmar", icon: FileText, onSelect: () => onAbrirFormulario(tarea) }
        )
      }
      break
    case 4: // APROBADO
    case 7: // FIRMADO
      if (tarea.registroId) {
        items.push(
          tarea.esFisico
            ? { kind: "item", label: "Descargar registro", icon: FileDown, onSelect: () => archivoFisico.abrir(), disabled: archivoFisico.isLoading }
            : { kind: "item", label: "Ver registro", icon: FileText, onSelect: () => onAbrirFormulario(tarea) }
        )
      }
      break
    case 5: // RECHAZADO
      if (tarea.registroId) {
        if (tarea.esFisico) {
          items.push({ kind: "item", label: "Descargar registro", icon: FileDown, onSelect: () => archivoFisico.abrir(), disabled: archivoFisico.isLoading })
        } else if (permitirDigital) {
          items.push({ kind: "item", label: "Revisar y re-completar", icon: FileText, onSelect: () => onAbrirFormulario(tarea), variant: "destructive" })
        }
        if (tarea.planillaId && permitirFisico) {
          items.push({ kind: "item", label: cargarRegistroLabel, icon: Upload, onSelect: () => onCargarPdf(tarea), variant: "destructive" })
        }
      }
      break
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

  // Planilla en blanco — siempre que haya planilla
  if (tarea.planillaId) {
    if (items.length > 0) items.push({ kind: "separator" })
    const urlDescarga = `/api/planillas/${tarea.planillaId}/pdf/blanco/${tarea.id}`
    const urlPreview = `/api/planillas/${tarea.planillaId}/pdf/blanco/${tarea.id}/preview`
    items.push({ kind: "item", label: "Descargar planilla", icon: Download, onSelect: () => triggerDownload(urlDescarga) })
    items.push({ kind: "item", label: "Vista previa", icon: Eye, onSelect: () => window.open(urlPreview, "_blank", "noreferrer") })
  }

  // Firmas (solo cuando registro físico)
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

// ─── Hook: archivo físico subido (carga on-demand y abre en nueva pestaña) ───

function useArchivoFisico(registroId: string | null) {
  const query = useQuery({
    queryKey: ["registro-archivos", registroId],
    queryFn: () => apiClient.get<{ data: RegistroArchivo[] }>(`/api/registros/${registroId}/archivos`),
    enabled: false, // carga on-demand
    staleTime: 1000 * 50, // un poco menos que los 60 min de la SAS
  })

  async function abrir() {
    if (!registroId) return
    const result = await query.refetch()
    const lista = (result.data as any)?.data as RegistroArchivo[] | undefined
    const primero = lista?.[0]
    if (primero?.url) window.open(primero.url, "_blank", "noreferrer")
  }

  return { abrir, isLoading: query.isLoading }
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
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
      {mostrarAsignado && (
        <span>Asignado: <span className="font-medium text-gray-700">{tarea.asignadoNombre}</span></span>
      )}
      {fecha && (
        <span>{fecha.label}: <span className="font-medium text-gray-700">{formatFecha(fecha.value)}</span></span>
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
