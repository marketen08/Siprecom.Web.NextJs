"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Copy, Download, Pencil, Settings, Trash2 } from "lucide-react"
import Link from "next/link"

import type { Planilla } from "@/features/planillas/types"
import { useOpenPlanilla } from "@/features/planillas/hooks/use-open-planilla"
import { useDeletePlanilla } from "@/features/planillas/api/use-delete-planilla"
import { useClonePlanilla } from "@/features/planillas/api/use-clone-planilla"
import { exportarPlanilla } from "@/features/planillas/api/use-import-export"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ planilla }: { planilla: Planilla }) {
  const { open } = useOpenPlanilla()
  const deleteMutation = useDeletePlanilla()
  const cloneMutation = useClonePlanilla()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Editar datos"
        onClick={() => open(planilla.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Diseñar planilla"
        asChild
      >
        <Link href={`/configuracion/planillas/${planilla.id}`}>
          <Settings className="h-4 w-4" />
        </Link>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Exportar JSON"
        onClick={() => exportarPlanilla(planilla.id)}
      >
        <Download className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Copy className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
        title="¿Clonar planilla?"
        description={
          <>
            Se creará una copia de <strong>{planilla.nombre}</strong> con todas sus secciones y campos. La nueva planilla tendrá el sufijo "(copia)" en el nombre.
          </>
        }
        confirmText="Clonar"
        pendingText="Clonando..."
        onConfirm={() => cloneMutation.mutateAsync(planilla.id)}
      />

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar planilla?"
        description={
          <>
            Esta acción eliminará <strong>{planilla.nombre}</strong>. Podés reactivarla después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(planilla.id)}
      />
    </div>
  )
}

function formatFecha(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export const columns: ColumnDef<Planilla>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nombre}</span>
    ),
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => (
      <span className="block text-sm text-muted-foreground line-clamp-2 max-w-sm whitespace-normal wrap-break-word">
        {row.original.descripcion || "—"}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Última actualización",
    cell: ({ row }) => (
      <div className="text-sm leading-tight">
        <div>{formatFecha(row.original.updatedAt)}</div>
        {row.original.updatedByNombre && (
          <div className="text-xs text-muted-foreground">por {row.original.updatedByNombre}</div>
        )}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions planilla={row.original} />,
  },
]
