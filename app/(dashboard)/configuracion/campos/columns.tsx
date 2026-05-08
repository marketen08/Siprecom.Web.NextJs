"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { Campo } from "@/features/campos/types"
import { CAMPO_TIPO_DATO, type CampoTipoDato } from "@/features/planillas/types"
import { useOpenCampo } from "@/features/campos/hooks/use-open-campo"
import { useDeleteCampoGlobal } from "@/features/campos/api/use-delete-campo"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ campo }: { campo: Campo }) {
  const { open } = useOpenCampo()
  const deleteMutation = useDeleteCampoGlobal()
  const enUso = (campo.usoCount ?? 0) > 0

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Editar"
        onClick={() => open(campo.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {enUso ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          disabled
          title={`No se puede eliminar: usado en ${campo.usoCount} planilla(s)`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <ConfirmActionDialog
          trigger={<Trash2 className="h-4 w-4" />}
          triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
          title="¿Eliminar campo?"
          description={
            <>
              Esta acción eliminará <strong>{campo.etiqueta}</strong>. Como no está siendo usado en ninguna planilla, es seguro borrarlo.
            </>
          }
          confirmText="Eliminar"
          pendingText="Eliminando..."
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(campo.id)}
        />
      )}
    </div>
  )
}

export const columns: ColumnDef<Campo>[] = [
  {
    accessorKey: "etiqueta",
    header: "Etiqueta",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.etiqueta}</span>
    ),
  },
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.original.codigo}</span>
    ),
  },
  {
    accessorKey: "tipoDato",
    header: "Tipo",
    cell: ({ row }) => (
      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
        {CAMPO_TIPO_DATO[row.original.tipoDato as CampoTipoDato] ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "unidad",
    header: "Unidad",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.unidad || "—"}</span>
    ),
  },
  {
    accessorKey: "usoCount",
    header: "Uso",
    cell: ({ row }) => {
      const n = row.original.usoCount ?? 0
      if (n === 0) {
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
            Sin uso
          </span>
        )
      }
      return (
        <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">
          {n} planilla{n !== 1 ? "s" : ""}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions campo={row.original} />,
  },
]
