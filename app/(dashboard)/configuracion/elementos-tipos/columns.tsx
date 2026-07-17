"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import type { ElementoTipo } from "@/features/elementostipos/types"
import { useOpenElementoTipo } from "@/features/elementostipos/hooks/use-open-elementotipo"
import { useDeleteElementoTipo } from "@/features/elementostipos/api/use-delete-elementotipo"
import { TIPO_CERTIFICADO_LABEL } from "@/features/certificados/types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

// Chip Sí/No con colores discretos para las columnas booleanas.
function BoolChip({ value }: { value: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        value
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 text-xs"
          : "border-gray-200 bg-gray-50 text-gray-500 text-xs"
      }
    >
      {value ? "Sí" : "No"}
    </Badge>
  )
}

function RowActions({ tipo }: { tipo: ElementoTipo }) {
  const { open } = useOpenElementoTipo()
  const deleteMutation = useDeleteElementoTipo()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(tipo.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar tipo de elemento?"
        description={
          <>
            Esta acción eliminará <strong>{tipo.nombre}</strong>. Podés reactivarlo después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(tipo.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<ElementoTipo>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => {
      const { nombre, esSintetico, certificadoQueAlimenta } = row.original
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{nombre}</span>
          {esSintetico && (
            <Badge variant="secondary" className="text-xs">
              Sintético
              {certificadoQueAlimenta
                ? ` · ${TIPO_CERTIFICADO_LABEL[certificadoQueAlimenta]}`
                : ""}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "especialidadNombre",
    header: "Especialidad",
    cell: ({ row }) => {
      const nombre = row.original.especialidadNombre
      const color = row.original.especialidadColor
      const codigo = row.original.especialidadCodigo
      if (!nombre) return <span className="text-sm text-muted-foreground">—</span>
      return (
        <span className="inline-flex items-center gap-2 text-sm">
          {color && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <span className="text-gray-700">{codigo ? `${codigo} — ${nombre}` : nombre}</span>
        </span>
      )
    },
  },
  {
    accessorKey: "horasAdicionalesDefault",
    header: "Hs. adicionales",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.horasAdicionalesDefault}</span>
    ),
  },
  {
    accessorKey: "impactoFactorDefault",
    header: "Factor impacto",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.impactoFactorDefault}</span>
    ),
  },
  {
    accessorKey: "esSintetico",
    header: "Sintético",
    cell: ({ row }) => <BoolChip value={row.original.esSintetico} />,
  },
  {
    accessorKey: "permiteAgrupar",
    header: "Agrupar",
    cell: ({ row }) => <BoolChip value={row.original.permiteAgrupar} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions tipo={row.original} />,
  },
]
