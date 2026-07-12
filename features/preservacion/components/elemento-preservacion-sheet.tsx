"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Loader2 } from "lucide-react"

import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetElementosTareasPorElemento } from "@/features/elementos-tareas/api/use-get-elementostareas-por-elemento"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useTareaHandlers } from "@/features/elementos-tareas/hooks/use-tarea-handlers"
import { TareaCard } from "@/features/elementos-tareas/components/tarea-card"
import { useCanWrite } from "@/lib/use-roles"
import type { ElementoTarea } from "@/features/elementos-tareas/types"

import { PreservacionTimeline } from "./preservacion-timeline"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  elementoId: string | null
  open: boolean
  onClose: () => void
}

interface GrupoTarea {
  tareaId: string
  tareaNombre: string
  ciclos: ElementoTarea[]
}

/**
 * Agrupa las ElementoTarea de preservación por catálogo Tarea. Cada grupo
 * mantiene la cadena de ciclos ordenada cronológicamente por CicloNumero (el
 * backend ya devuelve las ET ordenadas por fecha; el sort de acá es defensivo).
 */
function agruparPorTarea(tareas: ElementoTarea[]): GrupoTarea[] {
  const map = new Map<string, GrupoTarea>()
  for (const t of tareas) {
    let grupo = map.get(t.tareaId)
    if (!grupo) {
      grupo = { tareaId: t.tareaId, tareaNombre: t.tareaNombre, ciclos: [] }
      map.set(t.tareaId, grupo)
    }
    grupo.ciclos.push(t)
  }
  for (const g of map.values()) {
    // Descendente: el ciclo más reciente (mayor fecha planificada) primero. El
    // usuario quiere el próximo trabajo arriba y el histórico hacia abajo.
    g.ciclos.sort((a, b) => {
      const fa = a.fechaPlanificada ?? a.createdAt
      const fb = b.fechaPlanificada ?? b.createdAt
      return new Date(fb).getTime() - new Date(fa).getTime()
    })
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.tareaNombre ?? "").localeCompare(b.tareaNombre ?? "", undefined, { sensitivity: "base" }),
  )
}

/**
 * Sheet secundario del elemento, dedicado a preservación. Se abre desde el
 * banner del sheet principal cuando el elemento tiene tareas de mantenimiento
 * recurrente. Contiene:
 *  - Timeline de ciclos (misma vista que el fondo del sheet original).
 *  - Lista de tareas de preservación agrupadas por catálogo Tarea, con el
 *    mismo menú de acciones que las tareas normales (reutiliza `TareaCard`).
 *
 * El sheet principal no se cierra al abrir este — quedan superpuestos y el
 * usuario cierra el secundario para volver al detalle del elemento.
 */
export function ElementoPreservacionSheet({ elementoId, open, onClose }: Props) {
  const { data: elementoRaw } = useGetElemento(open ? elementoId : null)
  const { data: tareasRaw, isLoading: loadingTareas } = useGetElementosTareasPorElemento(open ? elementoId : null)
  const elemento = elementoRaw?.data

  const { data: proyectoRaw } = useGetProyecto(elemento?.proyectoId ?? null)
  const proyecto = proyectoRaw?.data
  const permitirFisico = proyecto?.permitirRegistroFisico ?? false
  const permitirDigital = proyecto?.permitirRegistroDigital ?? true
  const fisicoPreFirmado = proyecto?.registrosFisicosPreFirmados ?? false
  const permiteAdjuntosProyecto = proyecto?.permiteAdjuntos ?? false
  const permitirDescargarProcedimientos = proyecto?.funcionalidadesEfectivas?.DESCARGAR_PROCEDIMIENTOS ?? false

  const canWrite = useCanWrite()

  const {
    handleIniciar,
    handleAbrirFormulario,
    handleCargarPdf,
    handleReiniciar,
    iniciarMutation,
    reiniciarMutation,
    errorGate,
    setErrorGate,
  } = useTareaHandlers()

  const tareasPreservacion = useMemo(
    () => (tareasRaw?.data ?? []).filter((t) => t.esPreservacion),
    [tareasRaw?.data],
  )
  const grupos = useMemo(() => agruparPorTarea(tareasPreservacion), [tareasPreservacion])

  // Modo lista/timeline — pestaña interna. Los ciclos futuros y el histórico se
  // ven mejor visualmente en el timeline; las acciones se ejecutan mejor sobre
  // la lista de cards. Se ofrecen los dos accesos.
  const [modo, setModo] = useState<"lista" | "timeline">("lista")

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl! overflow-y-auto" side="right">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-700" />
            Preservación del elemento
          </SheetTitle>
          {elemento && (
            <SheetDescription className="text-xs text-muted-foreground">
              <span className="font-mono text-blue-700 mr-2">{elemento.tag}</span>
              {elemento.nombre}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="px-4 pb-8 space-y-4 mt-2">
          {/* Selector de modo */}
          <div className="inline-flex rounded-lg border bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setModo("lista")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                modo === "lista"
                  ? "bg-blue-100 text-blue-800"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Lista de tareas
            </button>
            <button
              type="button"
              onClick={() => setModo("timeline")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                modo === "timeline"
                  ? "bg-blue-100 text-blue-800"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Timeline
            </button>
          </div>

          {loadingTareas ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : tareasPreservacion.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              Este elemento no tiene tareas de preservación asignadas.
            </p>
          ) : modo === "timeline" ? (
            <PreservacionTimeline elementoId={elementoId} />
          ) : (
            <div className="space-y-6">
              {grupos.map((g) => (
                <div key={g.tareaId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {g.tareaNombre}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {g.ciclos.length === 1 ? "1 ciclo" : `${g.ciclos.length} ciclos`}
                    </span>
                  </div>
                  {g.ciclos.map((t) => (
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
                      canWrite={canWrite}
                      prefijoContexto={t.cicloNumero > 0 ? `Ciclo #${t.cicloNumero}` : "Ciclo inicial"}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={errorGate !== null} onOpenChange={(v) => !v && setErrorGate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No se puede iniciar la tarea</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {errorGate}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorGate(null)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
