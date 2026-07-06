"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRightLeft, CheckCircle2, Lock, MoreHorizontal, Pencil, PlayCircle,
  RefreshCw, RotateCcw, Trash2,
} from "lucide-react"

import type { TestGroup } from "@/features/testgroups/types"
import { ESTADO_TEST_GROUP } from "@/features/testgroups/types"
import { useOpenTestGroup } from "@/features/testgroups/hooks/use-open-testgroup"
import { useDeleteTestGroup } from "@/features/testgroups/api/use-delete-testgroup"
import { useTransicionTestGroup } from "@/features/testgroups/api/use-transicion-estado"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type DialogoAccion = null | "activar" | "aBorrador" | "recalcular" | "cerrar" | "eliminar"

interface Props {
  tg: Pick<TestGroup, "id" | "codigo" | "estado">
  /**
   * Callback opcional tras eliminación exitosa. Útil en el detalle para
   * redirigir al listado — sin esto el user queda en una ruta que ya no existe.
   */
  onAfterDelete?: () => void
  /**
   * Modo de presentación del trigger:
   *   "icon" (default) — botón redondo con `⋯`, para tablas.
   *   "labeled" — botón con texto "Acciones", para headers de detalle.
   */
  variant?: "icon" | "labeled"
}

/**
 * Menú unificado de acciones para un TestGroup. Se usa en la fila de la tabla
 * `/alcance/test-groups` y en el header del detalle `/alcance/test-groups/[id]`.
 * Extraído para que un cambio en la lista de acciones se refleje en ambos lugares.
 */
export function TestGroupActionsMenu({ tg, onAfterDelete, variant = "icon" }: Props) {
  const { open: openEditor } = useOpenTestGroup()
  const deleteMutation = useDeleteTestGroup()
  const transicion = useTransicionTestGroup()

  const [dialogo, setDialogo] = useState<DialogoAccion>(null)
  const cerrar = () => setDialogo(null)

  const isBorrador = tg.estado === ESTADO_TEST_GROUP.BORRADOR
  const isActivo = tg.estado === ESTADO_TEST_GROUP.ACTIVO
  const isCompletado = tg.estado === ESTADO_TEST_GROUP.COMPLETADO
  const isCerrado = tg.estado === ESTADO_TEST_GROUP.CERRADO

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            variant === "labeled" ? (
              <Button variant="outline" size="sm" className="gap-2" aria-label="Acciones">
                Acciones
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Acciones">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          {!isCerrado && (
            <DropdownMenuItem render={<Link href={`/alcance/test-groups/asignacion?testGroupId=${tg.id}`} />}>
              <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              Asignar elementos
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => openEditor(tg.id)} disabled={isCerrado}>
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>

          {(isBorrador || isActivo || isCompletado) && <DropdownMenuSeparator />}

          {isBorrador && (
            <DropdownMenuItem onClick={() => setDialogo("activar")} className="text-blue-700">
              <PlayCircle className="h-4 w-4" />
              Activar
            </DropdownMenuItem>
          )}

          {isActivo && (
            <>
              <DropdownMenuItem onClick={() => setDialogo("aBorrador")}>
                <RotateCcw className="h-4 w-4" />
                Volver a borrador
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialogo("recalcular")} className="text-green-700">
                <RefreshCw className="h-4 w-4" />
                Recalcular estado
              </DropdownMenuItem>
            </>
          )}

          {isCompletado && (
            <DropdownMenuItem onClick={() => setDialogo("cerrar")} className="text-slate-700">
              <Lock className="h-4 w-4" />
              Cerrar paquete
            </DropdownMenuItem>
          )}

          {isBorrador && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDialogo("eliminar")} variant="destructive">
                <Trash2 className="h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}

          {isCerrado && (
            <DropdownMenuItem disabled>
              <CheckCircle2 className="h-4 w-4" />
              Paquete cerrado
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmActionDialog
        open={dialogo === "activar"}
        onOpenChange={(o) => !o && cerrar()}
        title="¿Activar paquete?"
        description={
          <>
            Se instanciarán las tareas del proyecto con <code>TipoAsignacion</code> coincidente al tipo del paquete
            y pasará a <strong>ACTIVO</strong>.
          </>
        }
        confirmText="Activar"
        pendingText="Activando..."
        onConfirm={() => transicion.mutateAsync({ id: tg.id, accion: "activar" })}
      />

      <ConfirmActionDialog
        open={dialogo === "aBorrador"}
        onOpenChange={(o) => !o && cerrar()}
        title="¿Volver a borrador?"
        description={<>Solo si aún no se inició ninguna tarea del paquete.</>}
        confirmText="Volver a borrador"
        pendingText="Actualizando..."
        onConfirm={() => transicion.mutateAsync({ id: tg.id, accion: "volver-a-borrador" })}
      />

      <ConfirmActionDialog
        open={dialogo === "recalcular"}
        onOpenChange={(o) => !o && cerrar()}
        title="¿Recalcular estado?"
        description={<>Si todas las tareas están terminales, pasa a COMPLETADO.</>}
        confirmText="Recalcular"
        pendingText="Recalculando..."
        onConfirm={() => transicion.mutateAsync({ id: tg.id, accion: "recalcular-estado" })}
      />

      <ConfirmActionDialog
        open={dialogo === "cerrar"}
        onOpenChange={(o) => !o && cerrar()}
        title="¿Cerrar paquete?"
        description={<>Una vez cerrado, no se permiten más cambios.</>}
        confirmText="Cerrar"
        pendingText="Cerrando..."
        onConfirm={() => transicion.mutateAsync({ id: tg.id, accion: "cerrar" })}
      />

      <ConfirmActionDialog
        open={dialogo === "eliminar"}
        onOpenChange={(o) => !o && cerrar()}
        title="¿Eliminar paquete?"
        description={<>Esta acción eliminará <strong>{tg.codigo}</strong>.</>}
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(tg.id)
          onAfterDelete?.()
        }}
      />
    </>
  )
}
