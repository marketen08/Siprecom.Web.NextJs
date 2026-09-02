"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Copy, Download, FileText, MoreHorizontal, Pencil, Settings, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import type { Planilla } from "@/features/planillas/types"
import { useOpenPlanilla } from "@/features/planillas/hooks/use-open-planilla"
import { useDeletePlanilla } from "@/features/planillas/api/use-delete-planilla"
import { useClonePlanilla } from "@/features/planillas/api/use-clone-planilla"
import { exportarPlanilla } from "@/features/planillas/api/use-import-export"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function RowActions({ planilla }: { planilla: Planilla }) {
  const router = useRouter()
  const { open } = useOpenPlanilla()
  const deleteMutation = useDeletePlanilla()
  const cloneMutation = useClonePlanilla()

  const [cloneOpen, setCloneOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleClone = async () => {
    await cloneMutation.mutateAsync(planilla.id)
    setCloneOpen(false)
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(planilla.id)
    setDeleteOpen(false)
  }

  const descargarPdf = () => {
    window.open(`/api/planillas/${planilla.id}/pdf/blanco`, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          title="Acciones"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer bg-transparent border-0 p-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="cursor-pointer" onClick={() => open(planilla.id)}>
            <Pencil className="h-4 w-4" />
            Editar datos
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/configuracion/planillas/${planilla.id}`)}>
            <Settings className="h-4 w-4" />
            Diseñar planilla
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem className="cursor-pointer" onClick={descargarPdf}>
            <FileText className="h-4 w-4" />
            Descargar PDF
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => exportarPlanilla(planilla.id)}>
            <Download className="h-4 w-4" />
            Exportar JSON
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setCloneOpen(true)}>
            <Copy className="h-4 w-4" />
            Clonar
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clonar */}
      <AlertDialog open={cloneOpen} onOpenChange={(o) => !cloneMutation.isPending && setCloneOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Clonar planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una copia de <strong>{planilla.nombre}</strong> con todas sus secciones y campos. La nueva planilla tendrá el sufijo "(copia)" en el nombre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cloneMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleClone() }}
              disabled={cloneMutation.isPending}
            >
              {cloneMutation.isPending ? "Clonando..." : "Clonar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Eliminar */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => !deleteMutation.isPending && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>{planilla.nombre}</strong>. Podés reactivarla después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function formatFecha(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export const columns: ColumnDef<Planilla>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.original.codigo || "—"}
      </span>
    ),
  },
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
    id: "grupos",
    header: "Grupos",
    cell: ({ row }) => {
      const p = row.original
      const grupos = p.grupos ?? []
      if (grupos.length === 0) {
        return (
          <span
            className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-500 italic"
            title="Sin grupo — visible en todos los proyectos (comodín)."
          >
            Sin grupo
          </span>
        )
      }
      return (
        <div className="flex flex-wrap gap-1">
          {grupos.map((g) => (
            <span
              key={g.id}
              className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 text-[11px] font-medium"
              title={g.nombre}
            >
              {g.nombre}
            </span>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "orientacionPdf",
    header: "PDF",
    cell: ({ row }) =>
      row.original.orientacionPdf === 1 ? (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          Apaisado
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
          Vertical
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
