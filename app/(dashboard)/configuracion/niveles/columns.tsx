"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Nivel } from "@/features/niveles/types"
import { useOpenNivel } from "@/features/niveles/hooks/use-open-nivel"
import { useCatalogoSoloLectura } from "@/components/catalogo-solo-lectura"
import { useDeleteNivel } from "@/features/niveles/api/use-delete-nivel"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ nivel }: { nivel: Nivel }) {
  const { open } = useOpenNivel()
  const deleteMutation = useDeleteNivel()
  // Catalogo global: el Admin lo ve, lo administra AdminGlobal.
  const { soloLectura, motivo } = useCatalogoSoloLectura()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={soloLectura}
        title={motivo}
        onClick={() => open(nivel.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {soloLectura ? (
        // El tacho en gris y sin dialogo: el boton existe para que la columna no cambie de
        // forma segun quien mira, pero no abre nada.
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/40"
          title={motivo}
          aria-label={motivo}
        >
          <Trash2 className="h-4 w-4" />
        </span>
      ) : (
      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar nivel?"
        description={
          <>
            Esta acción eliminará <strong>{nivel.nombre}</strong>. Podés reactivarlo después.
            Si el nivel está en uso por tareas, no se podrá eliminar.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(nivel.id)}
      />
      )}
    </div>
  )
}

export const columns: ColumnDef<Nivel>[] = [
  {
    accessorKey: "posicion",
    header: "Posición",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.posicion}</span>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => {
      const color = row.original.color
      return (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full border border-gray-200"
            style={{ backgroundColor: color || "#e5e7eb" }}
            aria-label={`Color ${color ?? "sin definir"}`}
          />
          <span className="font-medium">{row.original.nombre}</span>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions nivel={row.original} />,
  },
]
