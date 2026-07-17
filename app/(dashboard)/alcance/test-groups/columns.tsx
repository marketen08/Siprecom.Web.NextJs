"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Users } from "lucide-react"

import type { TestGroup } from "@/features/testgroups/types"
import { ESTADO_TEST_GROUP } from "@/features/testgroups/types"
import { TestGroupActionsMenu } from "@/features/testgroups/components/testgroup-actions-menu"

import { Badge } from "@/components/ui/badge"

function EstadoBadge({ estado, estadoTexto }: { estado: number; estadoTexto: string }) {
  const cls =
    estado === ESTADO_TEST_GROUP.BORRADOR
      ? "border-gray-300 text-gray-700 bg-gray-50"
      : estado === ESTADO_TEST_GROUP.ACTIVO
        ? "border-blue-300 text-blue-700 bg-blue-50"
        : estado === ESTADO_TEST_GROUP.COMPLETADO
          ? "border-green-300 text-green-700 bg-green-50"
          : "border-slate-400 text-slate-700 bg-slate-100"
  return <Badge variant="outline" className={cls}>{estadoTexto}</Badge>
}

export const columns: ColumnDef<TestGroup>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <Link
        href={`/alcance/test-groups/${row.original.id}`}
        className="font-mono text-sm font-medium text-blue-700 hover:underline"
      >
        {row.original.codigo}
      </Link>
    ),
  },
  {
    id: "tipoSintetico",
    header: "Tipo",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.elementoTipoSinteticoNombre ?? "—"}
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
    cell: ({ row }) => <EstadoBadge estado={row.original.estado} estadoTexto={row.original.estadoTexto} />,
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
    id: "progreso",
    header: "Progreso",
    cell: ({ row }) => {
      const tg = row.original
      if (tg.cantidadTareas === 0) {
        return <span className="text-xs text-muted-foreground">—</span>
      }
      const pct = tg.porcentajeAvance ?? 0
      return (
        <div className="flex items-center gap-2 min-w-35">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full ${pct >= 100 ? "bg-green-600" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground w-14 text-right">
            {tg.cantidadTareasTerminales ?? 0}/{tg.cantidadTareas} · {pct}%
          </span>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <TestGroupActionsMenu tg={row.original} />
      </div>
    ),
  },
]
