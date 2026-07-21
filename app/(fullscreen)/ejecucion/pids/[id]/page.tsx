"use client"

import { use, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Filter, MapPin, Menu } from "lucide-react"

import { useSidebar } from "@/components/sidebar-context"
import { useGetPid, useGetPidPendientes } from "@/features/pids/api/use-get-pids"
import { PidViewer } from "@/features/pids/components/pid-viewer"
import { NewPendienteSheet } from "@/features/pendientes/components/new-pendiente-sheet"
import { PendienteDetalleSheet } from "@/features/pendientes/components/pendiente-detalle-sheet"
import { useNewPendiente } from "@/features/pendientes/hooks/use-new-pendiente"
import { useOpenPendiente } from "@/features/pendientes/hooks/use-open-pendiente"
import { useMovePinPendiente } from "@/features/pendientes/api/use-move-pin-pendiente"
import type { PidPendientePin } from "@/features/pids/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PidVisorPage({ params }: PageProps) {
  const { id } = use(params)
  const { toggle: toggleNav } = useSidebar()
  // Deep-link opcional: `?p=3&pin=<pendienteId>` — usado por el botón
  // "Ver en PID" del sheet de detalle de pendiente. Nos posiciona en la
  // página correcta y abre el detalle con el pin resaltado.
  const searchParams = useSearchParams()
  const initialPage = Number(searchParams.get("p") ?? "1") || 1
  const initialPinId = searchParams.get("pin")

  const { data: pidResp } = useGetPid(id)
  const pid = pidResp?.data

  const [page, setPage] = useState(initialPage)
  const [soloAbiertos, setSoloAbiertos] = useState(true)
  const [modoCrearPin, setModoCrearPin] = useState(false)

  const { data: pinsResp } = useGetPidPendientes(id, soloAbiertos)
  const pines = useMemo(() => pinsResp?.data ?? [], [pinsResp])

  const openNewPendiente = useNewPendiente((s) => s.open)
  const openPendienteDetalle = useOpenPendiente((s) => s.open)

  // Auto-abrir el detalle del pendiente que vino en `?pin=` — una sola vez
  // por deep-link. Si el user cierra el sheet, no lo reabrimos.
  const initialPinOpenedRef = useRef(false)
  useEffect(() => {
    if (initialPinOpenedRef.current) return
    if (!initialPinId) return
    initialPinOpenedRef.current = true
    openPendienteDetalle(initialPinId)
  }, [initialPinId, openPendienteDetalle])

  // Si el pendiente que vino por deep-link tiene una página distinta a la
  // actual (por ejemplo el user cambió `?p=` a mano), lo respetamos: el
  // efecto de arriba ya abrió el sheet; acá aseguramos la página también
  // solo si el pin está en la lista.
  useEffect(() => {
    if (!initialPinId || !pines.length) return
    const pin = pines.find((x) => x.id === initialPinId)
    if (pin && pin.pagina !== page && !initialPinOpenedRef.current) {
      setPage(pin.pagina)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pines, initialPinId])
  // Id del pendiente actualmente abierto en el sheet — el visor lo destaca con
  // flecha + halo pulsante para que el usuario ubique el pin de un vistazo.
  const focusedPendienteId = useOpenPendiente((s) => (s.isOpen ? s.id : null))

  const movePinMutation = useMovePinPendiente()
  const onPinMove = (pin: PidPendientePin, coord: { x: number; y: number }) => {
    movePinMutation.mutate({
      pendienteId: pin.id,
      pidPagina: pin.pagina, // conservamos la misma página; mover entre páginas es out-of-scope
      pidCoordX: coord.x,
      pidCoordY: coord.y,
    })
  }
  const puedeMoverPin = (pin: PidPendientePin) => {
    // Estados terminales: el backend rechaza. Ocultamos el gesto para no
    // confundir al usuario. El otro chequeo (creador vs admin/supervisor) lo
    // hace el backend — el 400 se muestra en el toast del mutation.
    return pin.estadoId !== "estado-pend-cerrado" && pin.estadoId !== "estado-pend-cancelado"
  }

  const onCrearPin = ({ x, y }: { x: number; y: number }) => {
    if (!pid) return
    // Pre-populamos el sheet con el vínculo al PID + primer subsistema
    // vinculado (si hay uno, el user puede cambiarlo o dejarlo).
    const subSistemaId = pid.subSistemaIds?.[0]
    openNewPendiente({
      pidArchivoId: pid.id,
      pidPagina: page,
      pidCoordX: x,
      pidCoordY: y,
      pid: pid.codigo,
      subSistemaId,
    })
    // Volver a modo view: el usuario elige de nuevo si quiere crear otro pin.
    setModoCrearPin(false)
  }

  const conteo = pines.filter((p) => p.pagina === page).length

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 4rem)" }}>
      <NewPendienteSheet hideOverlay />
      <PendienteDetalleSheet hideOverlay />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 shadow-sm">
        <button
          type="button"
          onClick={toggleNav}
          className="-ml-1 shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Abrir menú"
          title="Menú"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link
          href="/ejecucion/pids"
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
          title="Volver al listado"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <p className="font-mono text-xs text-blue-700 font-semibold shrink-0">
              {pid?.codigo ?? "…"}
            </p>
            <p className="text-sm text-gray-800 truncate">{pid?.nombre ?? ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSoloAbiertos((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              soloAbiertos
                ? "text-blue-700 bg-blue-50 border-blue-200"
                : "text-gray-600 bg-white border-input hover:bg-gray-50"
            }`}
            title={soloAbiertos ? "Mostrando pendientes activos" : "Mostrando todos"}
          >
            <Filter className="h-3.5 w-3.5" />
            {soloAbiertos ? "Activos" : "Todos"}
            <span className="ml-1 rounded-full bg-black/70 text-white px-1.5 text-[10px] font-bold tabular-nums">
              {conteo}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setModoCrearPin((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              modoCrearPin
                ? "text-white bg-blue-600 border-blue-600 hover:bg-blue-700"
                : "text-gray-700 bg-white border-input hover:bg-gray-50"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {modoCrearPin ? "Tocá el plano para marcar" : "Nuevo pendiente"}
          </button>
        </div>
      </div>

      {/* Feedback del mutation de mover pin */}
      {movePinMutation.isError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 flex items-center justify-between gap-2">
          <span>No se pudo mover el pin: {(movePinMutation.error as Error).message}</span>
          <button type="button" onClick={() => movePinMutation.reset()} className="text-red-600 hover:text-red-800 leading-none">
            ✕
          </button>
        </div>
      )}
      {movePinMutation.isPending && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-1.5 text-xs text-blue-700">
          Guardando nueva posición del pin…
        </div>
      )}

      {/* Visor + toolbar */}
      {pid ? (
        <PidViewer
          pidArchivoId={pid.id}
          totalPaginas={pid.pageCount}
          page={page}
          onPageChange={setPage}
          pines={pines}
          modoCrearPin={modoCrearPin}
          onCrearPin={onCrearPin}
          onPinClick={(pin) => openPendienteDetalle(pin.id)}
          onPinMove={onPinMove}
          puedeMoverPin={puedeMoverPin}
          focusedPinId={focusedPendienteId}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Cargando PID…
        </div>
      )}
    </div>
  )
}
