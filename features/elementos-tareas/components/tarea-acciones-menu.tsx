"use client"

import { useRef, useState } from "react"
import { Loader2, MoreVertical } from "lucide-react"

import { useUploadRegistroArchivo } from "@/features/registros/api/use-registro-archivos"
import { useDownloadProcedimiento } from "@/features/procedimientos/api/use-download-procedimiento"
import { useMarcarCompletadaSinRegistro } from "@/features/elementos-tareas/api/use-marcar-completada-sin-registro"
import { useTareaHandlers } from "@/features/elementos-tareas/hooks/use-tarea-handlers"
import { DependenciasSheet } from "@/features/elementos-tareas/components/dependencias-sheet"
import { buildTareaMenuItems } from "@/features/elementos-tareas/components/tarea-card"
import { useGetElementoTarea } from "@/features/elementos-tareas/api/use-get-elemento-tarea"
import type { ElementoTarea } from "@/features/elementos-tareas/types"

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

interface TareaAccionesMenuProps {
  /** Puede ser `null` mientras el wrapper lazy (`TareaAccionesMenuById`) espera
      la respuesta del fetch — en ese caso el menú se abre con un placeholder de
      "Cargando" en vez de los items. */
  tarea: ElementoTarea | null
  permitirFisico: boolean
  permitirDigital: boolean
  fisicoPreFirmado: boolean
  permiteAdjuntosProyecto: boolean
  permitirDescargarProcedimientos: boolean
  permitirAvanceSinRegistro: boolean
  canWrite: boolean
  /** Cuando true, el trigger es un botón "sm" outline (para tablas). */
  compact?: boolean
  /** DropdownMenu controlado — necesario para el wrapper lazy que abre a demanda. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Menú de acciones de una `ElementoTarea` — mismos ítems que `TareaCard` en el
 * sheet del elemento (iniciar / cargar / ver formulario / adjuntar / descargar
 * planilla o procedimiento / dependencias / reiniciar / marcar sin registro).
 * Encapsula el dropdown, sus mutaciones y todos los AlertDialogs relacionados.
 * No incluye el toggle de firmas del panel (esa UI es exclusiva de la card).
 */
export function TareaAccionesMenu({
  tarea,
  permitirFisico,
  permitirDigital,
  fisicoPreFirmado,
  permiteAdjuntosProyecto,
  permitirDescargarProcedimientos,
  permitirAvanceSinRegistro,
  canWrite,
  compact,
  open,
  onOpenChange,
}: TareaAccionesMenuProps) {
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

  const [reiniciarOpen, setReiniciarOpen] = useState(false)
  const [dependenciasOpen, setDependenciasOpen] = useState(false)
  const [marcarSinRegistroOpen, setMarcarSinRegistroOpen] = useState(false)
  const [observacionSinRegistro, setObservacionSinRegistro] = useState("")
  const [errorSinRegistro, setErrorSinRegistro] = useState<string | null>(null)
  const marcarSinRegistroMutation = useMarcarCompletadaSinRegistro()

  const adjuntoInputRef = useRef<HTMLInputElement>(null)
  const uploadAdjunto = useUploadRegistroArchivo(tarea?.registroId ?? "")
  const [notif, setNotif] = useState<{ type: "err" | "ok"; msg: string } | null>(null)

  const downloadProcedimiento = useDownloadProcedimiento()

  async function handleDescargarProcedimiento() {
    if (!tarea?.procedimientoId) return
    setNotif(null)
    try {
      await downloadProcedimiento.mutateAsync(tarea.procedimientoId)
    } catch (err) {
      setNotif({ type: "err", msg: (err as Error).message ?? "No se pudo descargar el procedimiento." })
    }
  }

  async function handleAdjuntoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !tarea?.registroId) return
    setNotif(null)
    try {
      await uploadAdjunto.mutateAsync(file)
      setNotif({ type: "ok", msg: `"${file.name}" adjuntado.` })
      setTimeout(() => setNotif(null), 3000)
    } catch (err) {
      setNotif({ type: "err", msg: (err as Error).message ?? "No se pudo adjuntar." })
    }
  }

  const puedeAdjuntar = !!tarea?.registroId && permiteAdjuntosProyecto && tarea.estado !== 5

  // Cuando el wrapper lazy aún no cargó `tarea`, `items` queda vacío — el
  // DropdownMenu se sigue montando con un placeholder de "Cargando" así el
  // trigger de Radix es estable desde el arranque (sino cambiar el DOM del
  // trigger entre estados hace que Radix pierda referencia y cierre al mover
  // el mouse la primera vez).
  const items = tarea
    ? buildTareaMenuItems({
        tarea,
        onIniciar: handleIniciar,
        onAbrirFormulario: handleAbrirFormulario,
        onCargarPdf: handleCargarPdf,
        onAdjuntarArchivo: () => adjuntoInputRef.current?.click(),
        onDescargarProcedimiento: handleDescargarProcedimiento,
        onRequestReiniciar: () => setReiniciarOpen(true),
        onAbrirDependencias: () => setDependenciasOpen(true),
        onMarcarSinRegistro: () => {
          setObservacionSinRegistro("")
          setErrorSinRegistro(null)
          setMarcarSinRegistroOpen(true)
        },
        isIniciando: iniciarMutation.isPending,
        isReiniciando: reiniciarMutation.isPending,
        // Sin toggle de firmas — el ítem se filtra devolviendo showFirmas=false y
        // ocultándolo si no aparece un onToggle real. buildTareaMenuItems agrega
        // "Ver firmas" siempre que tieneFirmas — para listado, lo removemos abajo.
        showFirmas: false,
        onToggleFirmas: () => {},
        permitirFisico,
        permitirDigital,
        fisicoPreFirmado,
        puedeAdjuntar,
        adjuntandoPending: uploadAdjunto.isPending,
        descargandoProcedimientoPending: downloadProcedimiento.isPending,
        permitirDescargarProcedimientos,
        permitirAvanceSinRegistro,
        canWrite,
      }).filter((it) => it.kind === "separator" || it.label !== "Ver firmas")
    : []

  const busy =
    iniciarMutation.isPending ||
    uploadAdjunto.isPending ||
    downloadProcedimiento.isPending ||
    marcarSinRegistroMutation.isPending

  async function handleConfirmReiniciar() {
    if (!tarea) return
    try {
      await handleReiniciar(tarea)
      setReiniciarOpen(false)
    } catch (err) {
      // Mostrar el motivo del rechazo (ej. "Sólo se pueden reiniciar tareas en
      // estado EN_PROCESO, COMPLETADO o RECHAZADO") en el toast — sin esto el
      // usuario ve el spinner desaparecer y cree que "el botón no hace nada".
      setNotif({ type: "err", msg: (err as Error)?.message ?? "No se pudo reiniciar la tarea." })
    }
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          render={
            compact ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                disabled={busy}
                aria-label="Acciones"
              />
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-500"
                disabled={busy}
                aria-label="Acciones"
              />
            )
          }
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {!tarea ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Cargando acciones…
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">
              Sin acciones disponibles.
            </div>
          ) : (
            items.map((item, i) =>
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
              ),
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <input ref={adjuntoInputRef} type="file" hidden onChange={handleAdjuntoFileSelected} />

      {notif && (
        <div
          className={
            "fixed bottom-4 right-4 z-50 rounded-md px-3 py-2 text-xs shadow-lg " +
            (notif.type === "err" ? "bg-red-600 text-white" : "bg-emerald-600 text-white")
          }
        >
          {notif.msg}
        </div>
      )}

      {/* Dialogs y sheets — solo se renderean cuando `tarea` está cargada; sino
          intentan leer campos de un objeto null y crashean. */}
      {tarea && (
        <>
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
                <AlertDialogCancel disabled={reiniciarMutation.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleConfirmReiniciar}
                  disabled={reiniciarMutation.isPending}
                >
                  {reiniciarMutation.isPending ? "Reiniciando..." : "Reiniciar"}
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

          <AlertDialog
            open={marcarSinRegistroOpen}
            onOpenChange={(v) => {
              if (!marcarSinRegistroMutation.isPending) setMarcarSinRegistroOpen(v)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Marcar tarea como completada sin registro?</AlertDialogTitle>
                <AlertDialogDescription>
                  La tarea pasará a <strong>completada</strong> sin cargar planilla
                  (física ni digital). Se aplicará la configuración de firmas del proyecto.
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
                <AlertDialogCancel disabled={marcarSinRegistroMutation.isPending}>Cancelar</AlertDialogCancel>
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
        </>
      )}

      <AlertDialog open={!!errorGate} onOpenChange={(v) => !v && setErrorGate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No se puede iniciar la tarea</AlertDialogTitle>
            <AlertDialogDescription>{errorGate ?? ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorGate(null)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Wrapper lazy — para listados que solo conocen el id ─────────────────────

interface TareaAccionesMenuByIdProps extends Omit<TareaAccionesMenuProps, "tarea" | "open" | "onOpenChange"> {
  elementoTareaId: string
}

/**
 * Variante para listados: renderea SIEMPRE `TareaAccionesMenu` (con `tarea=null`
 * hasta que el fetch responde) para que el trigger del DropdownMenu de Radix
 * esté en el DOM desde el arranque. La query queda lazy — solo dispara al
 * primer `onOpenChange(true)` del DropdownMenu.
 *
 * Antes montaba un `<Button>` custom cuando no había data y switcheaba a
 * `TareaAccionesMenu` cuando llegaba — pero ese switch cambiaba el trigger
 * DOM y Radix perdía referencia (al mover el mouse fuera del content la
 * primera vez, cerraba el menú por asumir que el trigger no era el actual).
 */
export function TareaAccionesMenuById({ elementoTareaId, ...rest }: TareaAccionesMenuByIdProps) {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)
  const { data: tarea } = useGetElementoTarea(elementoTareaId, { enabled: everOpened })

  const handleOpenChange = (nuevo: boolean) => {
    if (nuevo && !everOpened) setEverOpened(true)
    setOpen(nuevo)
  }

  return (
    <TareaAccionesMenu
      tarea={tarea ?? null}
      {...rest}
      open={open}
      onOpenChange={handleOpenChange}
    />
  )
}
