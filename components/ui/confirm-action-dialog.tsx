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

interface ConfirmActionDialogProps {
  /** Elemento que abre el diálogo (usualmente un botón con ícono) */
  trigger: React.ReactNode
  /** className aplicado al AlertDialogTrigger */
  triggerClassName?: string
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
  title,
  description,
  confirmText = "Confirmar",
  pendingText = "Procesando...",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const handleConfirm = async () => {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // Mantener abierto: el error se muestra fuera del diálogo (ej. por toast).
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
      <AlertDialogTrigger className={cn(triggerClassName)}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            className={actionClass}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? pendingText : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
