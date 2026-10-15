"use client"

import { CalendarClock } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ProximoCicloDialogProps {
  open: boolean
  /** ISO date-time del próximo ciclo generado. */
  fecha: string | null | undefined
  onClose: () => void
}

/**
 * Confirmación post-aprobación/firma para tareas de preservación: informa la
 * fecha del próximo ciclo que el backend ya generó como ElementoTarea PENDIENTE.
 * El usuario cierra el diálogo con "Entendido" — el `onClose` decide la navegación.
 */
export function ProximoCicloDialog({ open, fecha, onClose }: ProximoCicloDialogProps) {
  const fechaFmt = fecha
    ? new Date(fecha).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—"

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-700" />
            Próximo ciclo de preservación
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se generó automáticamente el próximo ciclo de esta tarea. Podés verlo
            en la lista de tareas pendientes del elemento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md border bg-blue-50 border-blue-200 p-3">
          <p className="text-xs text-blue-900 uppercase tracking-wide">Programado para</p>
          <p className="text-base font-semibold text-blue-900">{fechaFmt}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
