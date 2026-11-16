"use client"

import { useState, type ReactNode } from "react"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"

/**
 * Confirmación con un texto: el comentario de una firma, el motivo de un N/A o de una
 * anulación. Con `obligatorio` el botón queda deshabilitado hasta que se escriba algo.
 * El error del backend se muestra adentro, sin cerrar el diálogo.
 */
export function DialogoTexto({
  abierto, titulo, descripcion, etiqueta, obligatorio = false, accion, destructivo = false,
  pendiente, error, onCancelar, onConfirmar,
}: {
  abierto: boolean
  titulo: string
  descripcion: ReactNode
  etiqueta: string
  obligatorio?: boolean
  accion: string
  destructivo?: boolean
  pendiente: boolean
  error: string | null
  onCancelar: () => void
  onConfirmar: (texto: string) => void
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={(v) => !v && onCancelar()}>
      {/* El contenido se monta al abrir, así el texto arranca vacío cada vez. */}
      {abierto && (
        <Contenido
          titulo={titulo} descripcion={descripcion} etiqueta={etiqueta} obligatorio={obligatorio} accion={accion}
          destructivo={destructivo} pendiente={pendiente} error={error} onConfirmar={onConfirmar}
        />
      )}
    </AlertDialog>
  )
}

function Contenido({
  titulo, descripcion, etiqueta, obligatorio, accion, destructivo, pendiente, error, onConfirmar,
}: {
  titulo: string
  descripcion: ReactNode
  etiqueta: string
  obligatorio: boolean
  accion: string
  destructivo: boolean
  pendiente: boolean
  error: string | null
  onConfirmar: (texto: string) => void
}) {
  const [texto, setTexto] = useState("")
  return (
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1">
          <label className="text-sm font-medium">{etiqueta}{!obligatorio && <span className="font-normal text-muted-foreground"> (opcional)</span>}</label>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} autoFocus />
        </div>
        {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={destructivo ? "destructive" : "default"}
            disabled={pendiente || (obligatorio && !texto.trim())}
            onClick={(e) => { e.preventDefault(); onConfirmar(texto.trim()) }}
          >
            {pendiente ? "Guardando..." : accion}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
  )
}
