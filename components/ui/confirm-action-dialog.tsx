"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface ConfirmActionDialogProps {
  /**
   * Elemento que abre el diálogo (usualmente un botón con ícono).
   * Omitir cuando el diálogo se controla externamente vía `open`/`onOpenChange`
   * — típico al disparar desde un DropdownMenuItem.
   */
  trigger?: React.ReactNode
  /** className aplicado al AlertDialogTrigger */
  triggerClassName?: string
  /**
   * Control externo del diálogo. Si están seteados, el componente pasa a modo
   * controlado y no renderiza el AlertDialogTrigger. El caller es responsable
   * de setear `open` en `true` y de escuchar `onOpenChange(false)` para cerrar.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Título del diálogo */
  title: React.ReactNode
  /** Descripción / cuerpo del diálogo */
  description: React.ReactNode
  /** Texto del botón de acción cuando no está en pending */
  confirmText?: string
  /** Texto del botón de acción durante pending */
  pendingText?: string
  /** Texto del botón cancelar */
  cancelText?: string
  /** Variante visual del botón de acción. "destructive" usa fondo rojo */
  variant?: "default" | "destructive"
  /**
   * Callback de la acción. Debe devolver una Promise para que el diálogo:
   *  - muestre el estado pending,
   *  - cierre automáticamente al success,
   *  - se mantenga abierto si la promesa rechaza.
   */
  /**
   * Si se define, el diálogo muestra un input y exige escribir EXACTAMENTE este texto para
   * habilitar la acción. Para operaciones muy destructivas (ej. "ELIMINAR TODAS").
   */
  confirmPhrase?: string
  onConfirm: () => Promise<unknown>
}

/**
 * Diálogo de confirmación reusable para acciones que disparan una mutación.
 *
 * Encapsula:
 *  - estado open/closed propio,
 *  - cierre automático al resolver la promesa,
 *  - disabled + texto de pending mientras la acción está en curso,
 *  - se mantiene abierto si la promesa rechaza (para mostrar el error donde corresponda).
 *
 * Uso típico:
 *   <ConfirmActionDialog
 *     trigger={<Trash2 className="h-4 w-4" />}
 *     title="¿Eliminar X?"
 *     description={...}
 *     confirmText="Eliminar"
 *     pendingText="Eliminando..."
 *     variant="destructive"
 *     onConfirm={() => deleteMutation.mutateAsync(id)}
 *   />
 */
export function ConfirmActionDialog({
  trigger,
  triggerClassName,
  open: openProp,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  pendingText = "Procesando...",
  cancelText = "Cancelar",
  variant = "default",
  confirmPhrase,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const controlado = openProp !== undefined
  const open = controlado ? openProp : internalOpen
  const setOpen = (next: boolean) => {
    if (controlado) onOpenChange?.(next)
    else setInternalOpen(next)
  }
  const [pending, setPending] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const phraseOk = !confirmPhrase || typed.trim() === confirmPhrase

  // Reset del input y error cuando se abre el diálogo (útil en modo controlado
  // donde el open puede alternar sin recrear el componente).
  React.useEffect(() => {
    if (open) {
      setTyped("")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      setOpen(false)
    } catch (err) {
      // Mantener abierto y mostrar el mensaje del backend (ej. 400 de validación)
      // dentro del propio diálogo.
      setError((err as Error)?.message ?? "No se pudo completar la acción.")
    } finally {
      setPending(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    // Bloquear cierre por click afuera / Esc mientras la mutación está en curso.
    if (pending && !next) return
    setOpen(next)
  }

  const actionClass =
    variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : undefined

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined && (
        <AlertDialogTrigger className={cn("cursor-pointer", triggerClassName)}>
          {trigger}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmPhrase && (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Escribí{" "}
              <span className="font-mono font-semibold text-foreground">{confirmPhrase}</span>{" "}
              para confirmar:
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmPhrase}
              disabled={pending}
              autoFocus
            />
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 whitespace-pre-line">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            className={actionClass}
            onClick={handleConfirm}
            disabled={pending || !phraseOk}
          >
            {pending ? pendingText : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
