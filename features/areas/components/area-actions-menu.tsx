"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import type { Area } from "@/features/areas/types"
import { useOpenArea } from "@/features/areas/hooks/use-open-area"
import { useDeleteArea } from "@/features/areas/api/use-delete-area"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Dialogo = null | "eliminar"

interface Props {
  area: Pick<Area, "id" | "nombre">
  /** Callback opcional tras eliminación exitosa — útil en el detalle para redirigir. */
  onAfterDelete?: () => void
  /**
   * Modo de presentación del trigger:
   *   "icon" (default) — botón `⋯` para tablas.
   *   "labeled" — botón con texto "Acciones" para headers.
   */
  variant?: "icon" | "labeled"
}

/**
 * Menú unificado de acciones para un Área. Se usa en la fila de la tabla
 * `/alcance/areas` y (a futuro) en cualquier detalle de área.
 */
export function AreaActionsMenu({ area, onAfterDelete, variant = "icon" }: Props) {
  const { open: openEditor } = useOpenArea()
  const deleteMutation = useDeleteArea()

  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const cerrar = () => setDialogo(null)

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
          <DropdownMenuItem render={<Link href={`/alcance/areas/asignacion?areaId=${area.id}`} />}>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
            Asignar elementos
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => openEditor(area.id)}>
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setDialogo("eliminar")} variant="destructive">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmActionDialog
        open={dialogo === "eliminar"}
        onOpenChange={(o) => !o && cerrar()}
        title="¿Eliminar área?"
        description={
          <>
            Esta acción eliminará <strong>{area.nombre}</strong>. Podés reactivarla después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(area.id)
          onAfterDelete?.()
        }}
      />
    </>
  )
}
