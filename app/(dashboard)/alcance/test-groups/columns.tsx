"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2, Users } from "lucide-react"

import type { TestGroup } from "@/features/testgroups/types"
import { TIPO_TEST_GROUP } from "@/features/testgroups/types"
import { useOpenTestGroup } from "@/features/testgroups/hooks/use-open-testgroup"
import { useDeleteTestGroup } from "@/features/testgroups/api/use-delete-testgroup"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

function RowActions({ tg }: { tg: TestGroup }) {
  const { open } = useOpenTestGroup()
  const deleteMutation = useDeleteTestGroup()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(tg.id)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar paquete?"
        description={<>Esta acción eliminará <strong>{tg.codigo}</strong>.</>}
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(tg.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<TestGroup>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.codigo}</span>,
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => (
      <Badge variant={row.original.tipo === TIPO_TEST_GROUP.PRESSURE ? "default" : "secondary"}>
        {row.original.tipo === TIPO_TEST_GROUP.PRESSURE ? "Pressure" : "Basic Function"}
      </Badge>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.original.nombre || "—"}</span>,
  },
  {
    id: "subsistema",
    header: "Subsistema",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.subSistemaCodigo ? `${row.original.subSistemaCodigo} — ${row.original.subSistemaNombre}` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "estadoTexto",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.estadoTexto}</Badge>
    ),
  },
  {
    id: "conteo",
    header: "Elementos / Tareas",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
        <Users className="h-3.5 w-3.5" />
        {row.original.cantidadElementos} / {row.original.cantidadTareas}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions tg={row.original} />,
  },
]
