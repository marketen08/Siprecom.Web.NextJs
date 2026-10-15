"use client"

import { AlertTriangle, Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { useGetElemento } from "@/features/elementos/api/use-get-elemento"

import { useSearchPendientes } from "../api/use-search-pendientes"
import { useNewPendiente } from "../hooks/use-new-pendiente"
import { useOpenPendiente } from "../hooks/use-open-pendiente"
import { ESTADO_COLOR, ESTADO_LABEL, type Pendiente } from "../types"
import { NewPendienteSheet } from "./new-pendiente-sheet"
import { PendienteDetalleSheet } from "./pendiente-detalle-sheet"

/**
 * Parámetros de la consulta de pendientes de un Elemento. Se exportan para que
 * el badge del botón que abre este sheet use EXACTAMENTE la misma query key —
 * así comparten caché y el listado aparece instantáneo al abrir.
 */
export function paramsPendientesDeElemento(elementoId: string | null, enabled = true) {
  return {
    page: 1,
    pageSize: 50,
    filter: { elementoId: elementoId ?? undefined },
    enabled: enabled && !!elementoId,
  }
}

/** Contador para el badge. Comparte caché con el sheet. */
export function usePendientesDeElementoCount(elementoId: string | null) {
  const q = useSearchPendientes(paramsPendientesDeElemento(elementoId))
  return q.data?.total ?? 0
}

interface Props {
  elementoId: string | null
  elementoTag?: string | null
  open: boolean
  onClose: () => void
  /** El visor de PID lo usa para que el plano siga visible detrás del sheet. */
  hideOverlay?: boolean
  /**
   * El alta y el detalle son store-controlados y globales: si la pantalla que
   * usa este sheet YA los monta (ej. /ejecucion/pendientes), pasá false para no
   * duplicarlos.
   */
  mountSheets?: boolean
}

/**
 * Pendientes de un Elemento, en sheet. Reemplaza la navegación al listado
 * filtrado: desde la maqueta 3D (o cualquier contexto con un Elemento a mano)
 * se ven los pendientes sin perder el contexto visual.
 *
 * Incluye el alta pre-cargada con Sistema/SubSistema/Elemento, reutilizando el
 * `NewPendienteSheet` de siempre vía su store de prefill — el formulario, sus
 * validaciones y el wizard de descripción son los mismos de /ejecucion/pendientes.
 *
 * Pensado para reusarse: solo necesita el id del Elemento.
 */
export function PendientesElementoSheet({
  elementoId, elementoTag, open, onClose, hideOverlay, mountSheets = true,
}: Props) {
  const query = useSearchPendientes(paramsPendientesDeElemento(elementoId, open))
  // El alta necesita SubSistema (de ahí el form deriva el Sistema) y Especialidad.
  // Los resolvemos acá y no como props: así el componente se reusa pasando solo
  // el id del Elemento.
  const elementoQuery = useGetElemento(open ? elementoId : null)
  const elemento = elementoQuery.data?.data ?? null
  const pendientes: Pendiente[] = query.data?.data ?? []
  const nuevo = useNewPendiente()
  const abrirDetalle = useOpenPendiente((s) => s.open)

  // Terminados abajo: lo accionable primero.
  const ordenados = [...pendientes].sort((a, b) => {
    const terminal = (p: Pendiente) => (p.estadoNombre === "CERRADO" || p.estadoNombre === "CANCELADO" ? 1 : 0)
    return terminal(a) - terminal(b) || b.codigo - a.codigo
  })

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-xl! overflow-y-auto" hideOverlay={hideOverlay}>
          <SheetHeader className="pr-10">
            <SheetTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              Pendientes del elemento
            </SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              {elementoTag ? <>Observaciones abiertas y cerradas de <b>{elementoTag}</b>.</> : "Observaciones del elemento."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 px-3 sm:px-4 pb-6 space-y-3">
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={() => nuevo.open({
                elementoId: elementoId ?? undefined,
                subSistemaId: elemento?.subSistemaId ?? undefined,
                especialidadId: elemento?.elementoTipoEspecialidadId ?? undefined,
              })}
              disabled={!elementoId}
            >
              <Plus className="h-3.5 w-3.5" /> Nuevo pendiente para este elemento
            </Button>

            {query.isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando pendientes…
              </div>
            )}

            {query.isError && (
              <p className="text-xs text-destructive">
                {(query.error as Error)?.message ?? "No se pudieron cargar los pendientes."}
              </p>
            )}

            {!query.isLoading && !query.isError && ordenados.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-6">
                Este elemento no tiene pendientes registrados.
              </p>
            )}

            {ordenados.length > 0 && (
              <ul className="space-y-1.5">
                {ordenados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => abrirDetalle(p.id)}
                      className="w-full text-left rounded-md border border-gray-200 p-2.5 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{p.codigoFormateado}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${ESTADO_COLOR[p.estadoNombre ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                          {ESTADO_LABEL[p.estadoNombre ?? ""] ?? p.estadoNombre}
                        </span>
                      </div>
                      <p className="text-sm mt-1 line-clamp-2">{p.descripcion}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                        {p.categoriaNombre && <span>{p.categoriaNombre}</span>}
                        {p.tipoNombre && <span>{p.tipoNombre}</span>}
                        <span>{p.prioridadTexto}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* El alta y el detalle viven acá para los contextos que no los montan
          (el visor 3D, por ejemplo). Son los mismos de /ejecucion/pendientes:
          cada uno se controla por su propio store. */}
      {mountSheets && (
        <>
          <NewPendienteSheet hideOverlay={hideOverlay} />
          <PendienteDetalleSheet hideOverlay={hideOverlay} />
        </>
      )}
    </>
  )
}
