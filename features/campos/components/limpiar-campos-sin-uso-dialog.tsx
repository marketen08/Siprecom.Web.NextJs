"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

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

import { useEliminarCamposSinUso, useGetCamposSinUso } from "../api/use-limpiar-campos"
import type { CampoLimpieza, CampoOmitido, LimpiezaCamposResultado } from "../types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Una fila de la lista: código en monoespaciado + etiqueta, y el motivo si se saltea. */
function FilaCampo({ campo, motivo }: { campo: CampoLimpieza; motivo?: string }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1">
      <span className="font-mono text-[11px] text-gray-500 shrink-0">{campo.codigo}</span>
      <span className="text-xs text-gray-800">{campo.etiqueta}</span>
      <span className="text-[11px] text-muted-foreground">({campo.tipoDatoNombre})</span>
      {motivo && <span className="text-[11px] text-amber-700 basis-full">{motivo}</span>}
    </li>
  )
}

function ListaOmitidos({ omitidos }: { omitidos: CampoOmitido[] }) {
  if (omitidos.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Se saltean {omitidos.length}
      </p>
      <ul className="max-h-40 overflow-y-auto rounded-md border border-amber-200 bg-amber-50/50 px-3 py-1.5 divide-y divide-amber-100">
        {omitidos.map((c) => (
          <FilaCampo key={c.id} campo={c} motivo={c.motivo} />
        ))}
      </ul>
    </div>
  )
}

/**
 * Elimina de una vez todos los campos del catálogo que ninguna planilla usa.
 *
 * El diálogo muestra la lista completa antes de confirmar, y los que se saltean con su
 * motivo: un campo de otro equipo o con datos ya cargados no se toca. Al terminar se
 * queda abierto mostrando el resultado — un "se eliminaron 47" que desaparece no sirve
 * para verificar nada.
 */
export function LimpiarCamposSinUsoDialog({ open, onOpenChange }: Props) {
  const preview = useGetCamposSinUso(open)
  const eliminar = useEliminarCamposSinUso()

  const [resultado, setResultado] = useState<LimpiezaCamposResultado | null>(null)
  const [error, setError] = useState<string | null>(null)

  const data = preview.data?.data
  const eliminables = data?.eliminables ?? []
  const omitidos = data?.omitidos ?? []

  const cerrar = (next: boolean) => {
    if (eliminar.isPending) return
    if (!next) {
      setResultado(null)
      setError(null)
    }
    onOpenChange(next)
  }

  const confirmar = async () => {
    setError(null)
    try {
      const res = await eliminar.mutateAsync(eliminables.map((c) => c.id))
      setResultado(res.data)
      // Refresca el preview: lo que quedó sin eliminar sigue siendo lo que se ve.
      preview.refetch()
    } catch (err) {
      setError((err as Error)?.message ?? "No se pudieron eliminar los campos.")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={cerrar}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resultado ? "Limpieza terminada" : "¿Eliminar los campos sin uso?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {resultado
              ? resultado.eliminados === 1
                ? "Se eliminó 1 campo del catálogo."
                : `Se eliminaron ${resultado.eliminados} campos del catálogo.`
              : "Son los campos que ninguna planilla usa. Dejan de aparecer en el catálogo; " +
                "los que alguna planilla todavía usa no se tocan."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Resultado */}
        {resultado && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {resultado.eliminados} eliminado{resultado.eliminados !== 1 ? "s" : ""}
            </p>
            <ListaOmitidos omitidos={resultado.omitidos} />
          </div>
        )}

        {/* Preview */}
        {!resultado && (
          <div className="space-y-3">
            {preview.isLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando campos sin uso...
              </p>
            )}

            {preview.isError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                No se pudo obtener la lista de campos sin uso.
              </p>
            )}

            {!preview.isLoading && !preview.isError && (
              <>
                {eliminables.length === 0 && omitidos.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay campos sin uso: todo el catálogo está en alguna planilla.
                  </p>
                )}

                {eliminables.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-700">
                      Se van a eliminar {eliminables.length} campo
                      {eliminables.length !== 1 ? "s" : ""}
                    </p>
                    <ul className="max-h-60 overflow-y-auto rounded-md border border-gray-200 px-3 py-1.5 divide-y divide-gray-100">
                      {eliminables.map((c) => (
                        <FilaCampo key={c.id} campo={c} />
                      ))}
                    </ul>
                  </div>
                )}

                <ListaOmitidos omitidos={omitidos} />
              </>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 whitespace-pre-line">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={eliminar.isPending}>
            {resultado ? "Cerrar" : "Cancelar"}
          </AlertDialogCancel>
          {!resultado && (
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                confirmar()
              }}
              disabled={eliminar.isPending || preview.isLoading || eliminables.length === 0}
            >
              {eliminar.isPending
                ? "Eliminando..."
                : `Eliminar ${eliminables.length} campo${eliminables.length !== 1 ? "s" : ""}`}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
