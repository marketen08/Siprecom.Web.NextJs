"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package } from "lucide-react"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetElementoTestGroups } from "@/features/elementos/api/use-get-elemento-testgroups"
import { useGetAvanceElemento } from "@/features/avance/api/use-get-avance-elemento"
import { useGetElementosTareasPorElemento } from "@/features/elementos-tareas/api/use-get-elementostareas-por-elemento"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useTareaHandlers } from "@/features/elementos-tareas/hooks/use-tarea-handlers"
import { TareaCard } from "@/features/elementos-tareas/components/tarea-card"
import { useCanWrite } from "@/lib/use-roles"
import type { AvanceElementoDTO } from "@/features/avance/types"
import type { ElementoTarea } from "@/features/elementos-tareas/types"
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
import { CalendarClock, Loader2, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ElementoPreservacionSheet } from "@/features/preservacion/components/elemento-preservacion-sheet"

interface Props {
  elementoId: string | null
  avance: AvanceElementoDTO | null
  open: boolean
  onClose: () => void
  /**
   * Estado del sheet secundario de preservación — vive en la URL (`?preservacion=1`).
   * Cuando está abierto, el sheet principal se oculta para evitar dos sheets
   * superpuestos.
   */
  preservacionOpen: boolean
  onOpenPreservacion: () => void
  onClosePreservacion: () => void
}

export function ElementoDetalleSheet({
  elementoId,
  avance: avanceProp,
  open,
  onClose,
  preservacionOpen,
  onOpenPreservacion,
  onClosePreservacion,
}: Props) {
  const { data: elementoRaw, isLoading: loadingElemento } = useGetElemento(elementoId)
  const { data: elementoTestGroupsRaw } = useGetElementoTestGroups(elementoId)
  const testGroupsDelElemento = elementoTestGroupsRaw?.data ?? []
  // El detalle vive tanto en Alcance como Ejecución. Los links a paquetes van
  // al listado del mismo módulo.
  const pathname = usePathname()
  const packBaseHref = pathname?.startsWith("/ejecucion")
    ? "/ejecucion/test-groups"
    : "/alcance/test-groups"
  const { data: tareasRaw, isLoading: loadingTareas } = useGetElementosTareasPorElemento(elementoId)
  // Cuando el sheet se abre desde la lista, `avanceProp` viene con la fila. Cuando se
  // abre por URL directa (elemento fuera de la página cargada) llega null — pedimos el
  // avance individual al backend para que se muestren la barra, los estados y el resto.
  const { data: avanceRaw } = useGetAvanceElemento(!avanceProp && open ? elementoId : null)
  const avance = avanceProp ?? avanceRaw?.data ?? null
  // Handlers de iniciar/abrir/cargar/reiniciar compartidos entre este sheet y el de
  // preservación. Encapsula gate previo + navegación.
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
  const canWrite = useCanWrite()

  const elemento = elementoRaw?.data
  const tareasRaw2 = tareasRaw?.data ?? []
  // Separación por flujo: las tareas de preservación (mantenimiento recurrente) van
  // a un sheet secundario dedicado para no saturar el listado principal cuando el
  // elemento acumula ciclos. Se accede al secundario desde el banner.
  const tareas = tareasRaw2.filter((t) => !t.esPreservacion)
  const tareasPreservacion = tareasRaw2.filter((t) => t.esPreservacion)

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
  // Funcionalidad DESCARGAR_PROCEDIMIENTOS (default true en el catálogo). Cae a false
  // si el proyecto todavía no cargó (conservador — el menú no muestra la acción).
  const permitirDescargarProcedimientos = proyecto?.funcionalidadesEfectivas?.DESCARGAR_PROCEDIMIENTOS ?? false
  const permitirAvanceSinRegistro = proyecto?.permitirAvanceSinRegistro ?? false

  // Filtro por nivel — chips multi-select. Sin nada seleccionado = mostrar todos.
  // Con al menos un chip activo, solo se muestran los grupos cuya `nivelId` está
  // en el Set. Reset al cambiar de elemento — se maneja con `key` en el sheet
  // de nivel superior; acá alcanza con setState local.
  const [nivelesSel, setNivelesSel] = useState<Set<string>>(new Set())

  // Mapa nivelId → color para los chips y encabezados. Se consulta el catálogo
  // global de niveles porque el ElementoTareaDTO trae nivelNombre / nivelPosicion
  // pero no el color. Cached por react-query.
  const { data: nivelesData } = useGetNivelesSelect()
  const nivelColorPorId = new Map<string, string>()
  for (const n of nivelesData?.data ?? []) {
    if (n.color) nivelColorPorId.set(n.id, n.color)
  }
  const toggleNivel = (key: string) => {
    setNivelesSel((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const limpiarNiveles = () => setNivelesSel(new Set())


  // Cuando el sheet secundario de preservación está abierto, ocultamos el principal
  // para evitar dos sheets superpuestos. El componente sigue montado (mantiene el
  // fetch de tareas cacheado); solo el `<Sheet>` se cierra visualmente.
  const principalOpen = open && !preservacionOpen

  return (
    <Sheet open={principalOpen} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-4xl! overflow-y-auto" side="right">
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
                {/* Preferimos los datos del elemento — están siempre presentes cuando la
                    página lo carga por id. `avance` es fallback y puede venir null si el
                    sheet se abrió por URL directa con el elemento fuera de la página de
                    la lista. */}
                {(elemento.elementoTipoNombre ?? avance?.elementoTipoNombre) && (
                  <DataItem label="Tipo" value={(elemento.elementoTipoNombre ?? avance?.elementoTipoNombre)!} />
                )}
                {(elemento.elementoTipoEspecialidadNombre ?? avance?.elementoTipoEspecialidadNombre) && (
                  <DataItem label="Especialidad" value={(elemento.elementoTipoEspecialidadNombre ?? avance?.elementoTipoEspecialidadNombre)!} />
                )}
                {elemento.pid      && <DataItem label="PID"      value={elemento.pid} />}
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

          {/* Test packs que abarcan al elemento — aviso readonly.
              Un mismo elemento puede pertenecer a N packs. Las tareas del pack
              corren sobre el elemento sintético (no acá) — por eso el operador
              puede verlo como "cubierto" sin haber firmado nada en este detalle. */}
          {testGroupsDelElemento.length > 0 && (
            <section className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-700" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-900">
                  Pertenece a {testGroupsDelElemento.length === 1 ? "1 test pack" : `${testGroupsDelElemento.length} test packs`}
                </h3>
              </div>
              <p className="text-xs text-blue-900/70 mb-2">
                Las tareas de estos paquetes se ejecutan sobre el paquete, no sobre
                este elemento. Abrí el paquete para ver su estado.
              </p>
              <ul className="space-y-1">
                {testGroupsDelElemento.map((tg) => (
                  <li key={tg.testGroupId}>
                    <Link
                      href={`${packBaseHref}/${tg.testGroupId}`}
                      className="inline-flex items-center gap-2 text-sm text-blue-800 hover:underline"
                    >
                      <span className="font-mono font-semibold">{tg.codigo}</span>
                      {tg.nombre && <span>· {tg.nombre}</span>}
                      {tg.elementoTipoSinteticoNombre && (
                        <span className="text-xs text-blue-900/60">
                          ({tg.elementoTipoSinteticoNombre})
                        </span>
                      )}
                      <span className="text-xs text-blue-900/50">— {tg.estadoTexto}</span>
                    </Link>
                  </li>
                ))}
              </ul>
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
            ) : (() => {
              // Los grupos por nivel se calculan siempre (para armar los chips y
              // para saber qué renderizar). Cuando hay filtro activo, mostramos
              // solo los que están en `nivelesSel`.
              const gruposTodos = agruparPorNivel(tareas)
              const gruposVisibles = nivelesSel.size === 0
                ? gruposTodos
                : gruposTodos.filter((g) => nivelesSel.has(g.key))
              const totalVisibles = gruposVisibles.reduce((n, g) => n + g.tareas.length, 0)
              return (
                <div className="space-y-3">
                  {/* Chips por nivel — mismo patrón que /configuracion/planillas. */}
                  {gruposTodos.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-muted-foreground mr-1">Nivel:</span>
                      {gruposTodos.map((g) => {
                        const activo = nivelesSel.has(g.key)
                        const color = nivelColorPorId.get(g.key) ?? "#6b7280"
                        return (
                          <button
                            key={g.key}
                            type="button"
                            onClick={() => toggleNivel(g.key)}
                            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors cursor-pointer"
                            style={
                              activo
                                ? { backgroundColor: `${color}22`, color, borderColor: color }
                                : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                            }
                            title={g.nombre}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                            {g.nombre}
                            <span style={activo ? { color } : undefined} className={activo ? "" : "text-gray-400"}>
                              ({g.tareas.length})
                            </span>
                          </button>
                        )
                      })}
                      {nivelesSel.size > 0 && (
                        <button
                          type="button"
                          onClick={limpiarNiveles}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="h-3 w-3" /> Limpiar
                        </button>
                      )}
                    </div>
                  )}

                  {totalVisibles === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No hay tareas para los niveles seleccionados.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {gruposVisibles.map((g) => {
                        const color = nivelColorPorId.get(g.key)
                        return (
                        <div key={g.key} className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-500 px-1 flex items-center gap-1.5">
                            {color && (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: color }}
                                aria-hidden
                              />
                            )}
                            <span style={color ? { color } : undefined}>{g.nombre}</span>
                            <span className="text-gray-400 font-normal">({g.tareas.length})</span>
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
                              permitirAvanceSinRegistro={permitirAvanceSinRegistro}
                              canWrite={canWrite}
                            />
                          ))}
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
          </section>

          {/* Banner de preservación — el listado principal no muestra las tareas
              de mantenimiento recurrente; se accede al detalle desde acá. */}
          {tareasPreservacion.length > 0 && (
            <button
              type="button"
              onClick={onOpenPreservacion}
              className="w-full flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-left hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <CalendarClock className="h-5 w-5 text-blue-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900">Preservación</p>
                <p className="text-xs text-blue-700">
                  {tareasPreservacion.length === 1
                    ? "1 tarea de mantenimiento recurrente"
                    : `${tareasPreservacion.length} tareas de mantenimiento recurrente`}
                </p>
              </div>
              <span className="text-xs text-blue-700 font-medium shrink-0">Abrir →</span>
            </button>
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

      <ElementoPreservacionSheet
        elementoId={elementoId}
        open={open && preservacionOpen}
        onClose={onClosePreservacion}
      />
    </Sheet>
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
  // Dentro de cada nivel, orden alfabético por nombre de tarea (locale-aware,
  // case-insensitive). Los grupos siguen ordenados por posición del nivel.
  for (const grupo of map.values()) {
    grupo.tareas.sort((a, b) =>
      (a.tareaNombre ?? "").localeCompare(b.tareaNombre ?? "", undefined, { sensitivity: "base" }),
    )
  }
  return Array.from(map.values()).sort((a, b) => a.posicion - b.posicion)
}
function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  )
}
