"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2, Download } from "lucide-react"

import type { PidArchivo } from "@/features/pids/types"
import { useOpenPid } from "@/features/pids/hooks/use-open-pid"
import { useDeletePid, fetchPidDownloadUrl } from "@/features/pids/api/use-mutate-pids"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "—"
  const mb = bytes / 1024 / 1024
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

function RowActions({ pid }: { pid: PidArchivo }) {
  const { open } = useOpenPid()
  const deleteMutation = useDeletePid()

  const abrirEnPestana = async () => {
    try {
      const { url } = await fetchPidDownloadUrl(pid.id)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      /* el download endpoint devuelve el error en JSON — dejamos pasar. */
    }
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-700 hover:text-blue-900 hover:bg-blue-50 cursor-pointer"
            onClick={abrirEnPestana}
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Descargar PDF</TooltipContent>
      </Tooltip>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 cursor-pointer"
        onClick={() => open(pid.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors cursor-pointer"
        title="¿Eliminar PID?"
        description={
          <>
            Se eliminará <strong>{pid.codigo} — {pid.nombre}</strong>.
            {pid.cantidadPendientes > 0 && (
              <> Si tiene pendientes asociados, el borrado se rechaza.</>
            )}
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(pid.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<PidArchivo>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.original.codigo}</span>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => <span className="text-sm">{row.original.nombre}</span>,
  },
  {
    accessorKey: "subSistemaCodigos",
    header: "Subsistemas",
    cell: ({ row }) => {
      const codigos = row.original.subSistemaCodigos ?? []
      if (codigos.length === 0)
        return <span className="text-xs text-muted-foreground">—</span>
      return (
        <div className="flex flex-wrap gap-1">
          {codigos.slice(0, 4).map((c) => (
            <Badge key={c} variant="outline" className="font-mono text-[10px]">
              {c}
            </Badge>
          ))}
          {codigos.length > 4 && (
            <Badge variant="outline" className="text-[10px]">
              +{codigos.length - 4}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "pageCount",
    header: "Páginas",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{row.original.pageCount}</span>
    ),
  },
  {
    accessorKey: "tamanioBytes",
    header: "Tamaño",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {formatSize(row.original.tamanioBytes)}
      </span>
    ),
  },
  {
    accessorKey: "cantidadPendientes",
    header: "Pendientes",
    cell: ({ row }) => {
      const n = row.original.cantidadPendientes
      return (
        <Badge variant={n > 0 ? "default" : "outline"} className="tabular-nums">
          {n}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => <RowActions pid={row.original} />,
  },
]
