"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, Lock, Pencil, PlayCircle, RefreshCw, RotateCcw, Trash2, Users } from "lucide-react"

import type { TestGroup } from "@/features/testgroups/types"
import { ESTADO_TEST_GROUP, TIPO_TEST_GROUP } from "@/features/testgroups/types"
import { useOpenTestGroup } from "@/features/testgroups/hooks/use-open-testgroup"
import { useDeleteTestGroup } from "@/features/testgroups/api/use-delete-testgroup"
import { useTransicionTestGroup } from "@/features/testgroups/api/use-transicion-estado"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

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

function RowActions({ tg }: { tg: TestGroup }) {
  const { open } = useOpenTestGroup()
  const deleteMutation = useDeleteTestGroup()
  const transicion = useTransicionTestGroup()

  const isBorrador = tg.estado === ESTADO_TEST_GROUP.BORRADOR
  const isActivo = tg.estado === ESTADO_TEST_GROUP.ACTIVO
  const isCompletado = tg.estado === ESTADO_TEST_GROUP.COMPLETADO
  const isCerrado = tg.estado === ESTADO_TEST_GROUP.CERRADO

  return (
    <div className="flex items-center gap-1 justify-end">
      {isBorrador && (
        <ConfirmActionDialog
          trigger={
            <span className="inline-flex items-center gap-1 text-blue-700">
              <PlayCircle className="h-3.5 w-3.5" /> Activar
            </span>
          }
          triggerClassName="inline-flex items-center h-8 px-2 rounded-md text-xs font-medium hover:bg-blue-50 transition-colors"
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
      )}

      {isActivo && (
        <>
          <ConfirmActionDialog
            trigger={
              <span className="inline-flex items-center gap-1 text-gray-700">
                <RotateCcw className="h-3.5 w-3.5" /> A borrador
              </span>
            }
            triggerClassName="inline-flex items-center h-8 px-2 rounded-md text-xs font-medium hover:bg-accent transition-colors"
            title="¿Volver a borrador?"
            description={<>Solo si aún no se inició ninguna tarea del paquete.</>}
            confirmText="Volver a borrador"
            pendingText="Actualizando..."
            onConfirm={() => transicion.mutateAsync({ id: tg.id, accion: "volver-a-borrador" })}
          />
          <ConfirmActionDialog
            trigger={
              <span className="inline-flex items-center gap-1 text-green-700">
                <RefreshCw className="h-3.5 w-3.5" /> Recalcular
              </span>
            }
            triggerClassName="inline-flex items-center h-8 px-2 rounded-md text-xs font-medium hover:bg-green-50 transition-colors"
            title="¿Recalcular estado?"
            description={<>Si todas las tareas están terminales, pasa a COMPLETADO.</>}
            confirmText="Recalcular"
            pendingText="Recalculando..."
            onConfirm={() => transicion.mutateAsync({ id: tg.id, accion: "recalcular-estado" })}
          />
        </>
      )}

      {isCompletado && (
        <ConfirmActionDialog
          trigger={
            <span className="inline-flex items-center gap-1 text-slate-700">
              <Lock className="h-3.5 w-3.5" /> Cerrar
            </span>
          }
          triggerClassName="inline-flex items-center h-8 px-2 rounded-md text-xs font-medium hover:bg-accent transition-colors"
          title="¿Cerrar paquete?"
          description={<>Una vez cerrado, no se permiten más cambios.</>}
          confirmText="Cerrar"
          pendingText="Cerrando..."
          onConfirm={() => transicion.mutateAsync({ id: tg.id, accion: "cerrar" })}
        />
      )}

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(tg.id)} disabled={isCerrado}>
        <Pencil className="h-4 w-4" />
      </Button>

      {isBorrador && (
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
      )}

      {isCerrado && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" /> Cerrado
        </span>
      )}
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
    id: "actions",
    cell: ({ row }) => <RowActions tg={row.original} />,
  },
]
