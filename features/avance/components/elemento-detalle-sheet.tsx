"use client"

import { useRouter } from "next/navigation"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetElementosTareasPorElemento } from "@/features/elementos-tareas/api/use-get-elementostareas-por-elemento"
import { useIniciarTarea } from "@/features/elementos-tareas/api/use-iniciar-tarea"
import type { AvanceDTO } from "@/features/avance/types"
import type { ElementoTarea } from "@/features/elementos-tareas/types"
import { BarraAvance } from "@/components/barra-avance"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertCircle, Clock, CheckCircle2, XCircle, Ban,
  Loader2, Play, FileText, Upload,
} from "lucide-react"

interface Props {
  elementoId: string | null
  avance: AvanceDTO | null
  open: boolean
  onClose: () => void
}

export function ElementoDetalleSheet({ elementoId, avance, open, onClose }: Props) {
  const router = useRouter()
  const { data: elementoRaw, isLoading: loadingElemento } = useGetElemento(elementoId)
  const { data: tareasRaw, isLoading: loadingTareas } = useGetElementosTareasPorElemento(elementoId)
  const iniciarMutation = useIniciarTarea()

  const elemento = elementoRaw?.data
  const tareas = tareasRaw?.data ?? []

  async function handleIniciar(tarea: ElementoTarea) {
    const result = await iniciarMutation.mutateAsync(tarea.id) as any
    // El backend devuelve la ET actualizada con registroId — navegamos al form
    const registroId = result?.data?.registroId ?? result?.registroId
    if (registroId) {
      onClose()
      router.push(`/ejecucion/registros/${registroId}`)
    }
  }

  function handleAbrirFormulario(tarea: ElementoTarea) {
    if (!tarea.registroId) return
    onClose()
    router.push(`/ejecucion/registros/${tarea.registroId}`)
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
            <div className="space-y-2">
              <BarraAvance porcentaje={avance.porcentajeAvance} />
              <div className="flex flex-wrap gap-2 text-xs">
                <EstadoChip label="Pendiente"  value={avance.pendiente}  color="gray" />
                <EstadoChip label="En proceso" value={avance.enProceso}  color="blue" />
                <EstadoChip label="Completado" value={avance.completado} color="yellow" />
                <EstadoChip label="Aprobado"   value={avance.aprobado}   color="green" />
                <EstadoChip label="Rechazado"  value={avance.rechazado}  color="red" />
                {avance.cancelado > 0 && (
                  <EstadoChip label="Cancelado" value={avance.cancelado} color="muted" />
                )}
              </div>
            </div>
          )}

          {/* Datos del elemento */}
          {elemento && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Datos del elemento
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <DataItem label="Prioridad" value={elemento.prioridadTexto} />
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
              <div className="space-y-2">
                {tareas.map((t) => (
                  <div key={t.id} className="rounded-lg border bg-white p-3 space-y-2">
                    {/* Encabezado */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{t.codigo}</span>
                          {t.esCritica && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium">
                              <AlertCircle className="h-3 w-3" /> Crítica
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm text-gray-900">{t.tareaNombre}</p>
                      </div>
                      <EstadoBadge estado={t.estado} estadoTexto={t.estadoTexto} />
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      {t.asignadoNombre && (
                        <span>Asignado: <span className="font-medium text-gray-700">{t.asignadoNombre}</span></span>
                      )}
                      {t.fechaPlanificada && (
                        <span>Planif.: <span className="font-medium text-gray-700">{formatFecha(t.fechaPlanificada)}</span></span>
                      )}
                      {t.fechaInicio && (
                        <span>Inicio: <span className="font-medium text-gray-700">{formatFecha(t.fechaInicio)}</span></span>
                      )}
                      {t.fechaFinalizacion && (
                        <span>Fin: <span className="font-medium text-gray-700">{formatFecha(t.fechaFinalizacion)}</span></span>
                      )}
                      {t.horasEstimadas != null && (
                        <span>Hs. est.: <span className="font-medium text-gray-700">{t.horasEstimadas}</span></span>
                      )}
                    </div>

                    {t.porcentajeAvance > 0 && t.estado !== 4 && (
                      <BarraAvance porcentaje={t.porcentajeAvance} />
                    )}

                    {t.motivoRechazo && (
                      <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                        Motivo rechazo: {t.motivoRechazo}
                      </p>
                    )}

                    {/* Acciones */}
                    <TareaAcciones
                      tarea={t}
                      onIniciar={handleIniciar}
                      onAbrirFormulario={handleAbrirFormulario}
                      isIniciando={iniciarMutation.isPending && iniciarMutation.variables === t.id}
                    />
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

// ─── Acciones por estado ────────────────────────────────────────────────────

function TareaAcciones({
  tarea,
  onIniciar,
  onAbrirFormulario,
  isIniciando,
}: {
  tarea: ElementoTarea
  onIniciar: (t: ElementoTarea) => void
  onAbrirFormulario: (t: ElementoTarea) => void
  isIniciando: boolean
}) {
  // 1 = PENDIENTE
  if (tarea.estado === 1) {
    return (
      <div className="pt-1">
        <Button
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => onIniciar(tarea)}
          disabled={isIniciando}
        >
          {isIniciando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Iniciar tarea
        </Button>
      </div>
    )
  }

  // 2 = EN_PROCESO
  if (tarea.estado === 2 && tarea.registroId) {
    return (
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => onAbrirFormulario(tarea)}
        >
          <FileText className="h-3.5 w-3.5" />
          Completar formulario
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => onAbrirFormulario(tarea)}
        >
          <Upload className="h-3.5 w-3.5" />
          Cargar PDF
        </Button>
      </div>
    )
  }

  // 3 = COMPLETADO — ver registro y firmar
  if (tarea.estado === 3 && tarea.registroId) {
    return (
      <div className="pt-1">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => onAbrirFormulario(tarea)}
        >
          <FileText className="h-3.5 w-3.5" />
          Ver y firmar
        </Button>
      </div>
    )
  }

  // 4 = APROBADO — solo lectura
  if (tarea.estado === 4 && tarea.registroId) {
    return (
      <div className="pt-1">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => onAbrirFormulario(tarea)}
        >
          <FileText className="h-3.5 w-3.5" />
          Ver registro
        </Button>
      </div>
    )
  }

  // 5 = RECHAZADO — permite volver a completar
  if (tarea.estado === 5 && tarea.registroId) {
    return (
      <div className="pt-1">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => onAbrirFormulario(tarea)}
        >
          <FileText className="h-3.5 w-3.5" />
          Revisar y re-completar
        </Button>
      </div>
    )
  }

  return null
}

// ─── helpers ────────────────────────────────────────────────────────────────

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  )
}

function EstadoChip({
  label, value, color,
}: {
  label: string; value: number; color: "gray" | "blue" | "yellow" | "green" | "red" | "muted"
}) {
  if (value === 0) return null
  const styles = {
    gray:   "bg-gray-100 text-gray-700",
    blue:   "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green:  "bg-green-100 text-green-700",
    red:    "bg-red-100 text-red-700",
    muted:  "bg-gray-50 text-gray-400",
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${styles[color]}`}>
      {value} {label}
    </span>
  )
}

const ESTADO_ICONS: Record<number, React.ReactNode> = {
  1: <Clock className="h-3.5 w-3.5" />,
  2: <Loader2 className="h-3.5 w-3.5" />,
  3: <CheckCircle2 className="h-3.5 w-3.5" />,
  4: <CheckCircle2 className="h-3.5 w-3.5" />,
  5: <XCircle className="h-3.5 w-3.5" />,
  6: <Ban className="h-3.5 w-3.5" />,
}

const ESTADO_STYLES: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-green-100 text-green-700",
  5: "bg-red-100 text-red-700",
  6: "bg-gray-50 text-gray-400",
}

function EstadoBadge({ estado, estadoTexto }: { estado: number; estadoTexto: string }) {
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
