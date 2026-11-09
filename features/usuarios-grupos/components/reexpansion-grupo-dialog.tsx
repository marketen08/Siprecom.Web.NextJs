"use client"

import { useState } from "react"
import { Check, Loader2, Minus, Plus, RefreshCw } from "lucide-react"

import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  useAplicarReexpansion, useReexpansionPreview,
} from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import type { ReexpansionCambio, ReexpansionResultado } from "@/features/usuarios-grupos/types"

/**
 * Pone al día las asignaciones que salieron de expandir este grupo.
 *
 * Hace falta porque la expansión se guarda: mover la membresía ya no reescribe quién
 * está asignado —eso es lo que deja registro de quién tenía qué— así que sumar a
 * alguien al grupo no le trae nada hasta que se corre esto.
 *
 * Muestra la lista antes de confirmar y no un contador: la acción SACA gente de
 * trabajo asignado, y un "se cambiaron 47" después del hecho no deja verificar nada.
 */
export function ReexpansionGrupoDialog({
  grupoId,
  grupoNombre,
  onOpenChange,
}: {
  grupoId: string
  grupoNombre: string
  onOpenChange: (v: boolean) => void
}) {
  const { data, isLoading, error } = useReexpansionPreview(grupoId)
  const aplicar = useAplicarReexpansion()
  const [resultado, setResultado] = useState<ReexpansionResultado | null>(null)

  const preview = data?.data
  const agregar = preview?.agregar ?? []
  const quitar = preview?.quitar ?? []
  const sinCambios = agregar.length === 0 && quitar.length === 0

  const confirmar = async () => {
    try {
      const r = await aplicar.mutateAsync(grupoId)
      setResultado(r.data ?? null)
    } catch { /* el error se muestra abajo */ }
  }

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Poner al día las asignaciones de {grupoNombre}</AlertDialogTitle>
          <AlertDialogDescription>
            Sólo sobre tareas y pendientes abiertos, y sólo sobre asignaciones que salieron
            de este grupo: a quien fue agregado a mano no lo toca.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {resultado ? (
          // Queda abierto con el resultado: es una acción que mueve trabajo de manos y
          // conviene poder leer qué pasó antes de cerrar.
          <div className="space-y-2 py-4">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                {resultado.agregadas} asignación(es) agregada(s), {resultado.quitadas} quitada(s)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sobre {resultado.tareasTocadas} tarea(s) y {resultado.pendientesTocados} pendiente(s).
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando qué cambiaría...
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-destructive">{(error as Error).message}</p>
        ) : sinCambios ? (
          <div className="space-y-2 py-8 text-center">
            <Check className="mx-auto h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-gray-700">Ya está todo al día</p>
            <p className="text-xs text-muted-foreground">
              Las asignaciones de este grupo coinciden con sus {preview?.miembrosActuales ?? 0} miembro(s).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ListaCambios
              titulo="Se van a agregar"
              cambios={agregar}
              icono={<Plus className="h-3 w-3 text-green-600" />}
              clase="text-green-700"
            />
            <ListaCambios
              titulo="Se van a quitar"
              cambios={quitar}
              icono={<Minus className="h-3 w-3 text-red-600" />}
              clase="text-red-700"
            />
          </div>
        )}

        {aplicar.error && (
          <p className="text-xs text-destructive">{(aplicar.error as Error).message}</p>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={aplicar.isPending}>
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>
          {!resultado && !sinCambios && (
            <Button onClick={confirmar} disabled={isLoading || aplicar.isPending}>
              {aplicar.isPending
                ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Aplicando...</>
                : <><RefreshCw className="mr-1.5 h-4 w-4" /> Aplicar {agregar.length + quitar.length} cambio(s)</>}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ListaCambios({
  titulo, cambios, icono, clase,
}: {
  titulo: string
  cambios: ReexpansionCambio[]
  icono: React.ReactNode
  clase: string
}) {
  if (cambios.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold uppercase tracking-wide ${clase}`}>
        {titulo} ({cambios.length})
      </p>
      <div className="max-h-48 divide-y overflow-y-auto rounded border">
        {cambios.map((c, i) => (
          <div key={`${c.entidadId}-${c.usuarioId}-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-xs">
            {icono}
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {c.tipo}
            </span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground" title={c.etiqueta}>
              {c.etiqueta}
            </span>
            <span className="shrink-0 font-medium">{c.usuarioNombre}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
