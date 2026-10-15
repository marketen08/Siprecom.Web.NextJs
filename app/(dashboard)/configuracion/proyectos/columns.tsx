"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2, Star } from "lucide-react"

import type { Proyecto } from "@/features/proyectos/types"
import { ESTADO_COLORS, EstadoBadge } from "@/components/estado-proyecto-badge"
import { useOpenProyecto } from "@/features/proyectos/hooks/use-open-proyecto"
import { useDeleteProyecto } from "@/features/proyectos/api/use-delete-proyecto"
import { useActivarProyectoParaMi } from "@/features/proyectos/api/use-activar-proyecto-para-mi"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

// El badge y el mapa de colores viven en components/estado-proyecto-badge para que
// Avance por proyectos use exactamente los mismos. Se re-exportan porque page.tsx
// (tabla desktop y cards mobile) los importa desde acá.
export { ESTADO_COLORS, EstadoBadge }

/**
 * Activa el proyecto de la fila para el usuario actual. Vive acá y no en el
 * switcher de /ejecucion/proyectos porque ese lista sólo los proyectos ya
 * asignados: desde esta pantalla se ve todo el padrón, que es donde hace falta
 * poder entrar a un proyecto finalizado o recién importado.
 *
 * Si el proyecto ya es el activo, el botón queda marcado y deshabilitado.
 */
function ActivarParaMiAction({ proyecto }: { proyecto: Proyecto }) {
  const { data: perfil } = useGetPerfil()
  const activar = useActivarProyectoParaMi()

  const esActivo = perfil?.proyectoId === proyecto.id

  if (esActivo) {
    return (
      <span
        className="inline-flex items-center justify-center h-8 w-8 text-amber-500"
        title="Es tu proyecto activo"
        aria-label="Es tu proyecto activo"
      >
        <Star className="h-4 w-4 fill-current" />
      </span>
    )
  }

  return (
    <ConfirmActionDialog
      trigger={<Star className="h-4 w-4" />}
      triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-accent transition-colors"
      title="¿Activar este proyecto?"
      description={
        <>
          <strong>{proyecto.nombre}</strong> pasa a ser tu proyecto activo. Las pantallas
          que se scopean por proyecto —tareas, elementos, registros— van a mostrar
          los de este. Si todavía no tenés acceso asignado, se te asigna.
        </>
      }
      confirmText="Activar"
      pendingText="Activando..."
      onConfirm={() => activar.mutateAsync(proyecto.id)}
    />
  )
}

export function RowActions({ proyecto }: { proyecto: Proyecto }) {
  const { open } = useOpenProyecto()
  const deleteMutation = useDeleteProyecto()

  return (
    <div className="flex items-center gap-1 justify-end">
      <ActivarParaMiAction proyecto={proyecto} />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => open(proyecto.id)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <ConfirmActionDialog
        trigger={<Trash2 className="h-4 w-4" />}
        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
        title="¿Eliminar proyecto?"
        description={
          <>
            Esta acción eliminará <strong>{proyecto.nombre}</strong>. Podés reactivarlo después.
          </>
        }
        confirmText="Eliminar"
        pendingText="Eliminando..."
        variant="destructive"
        onConfirm={() => deleteMutation.mutateAsync(proyecto.id)}
      />
    </div>
  )
}

export const columns: ColumnDef<Proyecto>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <Link
        href={`/configuracion/proyectos/${row.original.id}`}
        className="font-medium text-blue-700 hover:underline"
      >
        {row.original.nombre}
      </Link>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
  },
  {
    accessorKey: "clienteNombre",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.clienteNombre ?? "—"}</span>
    ),
  },
  {
    accessorKey: "contratistaNombre",
    header: "Contratista",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.contratistaNombre ?? "—"}</span>
    ),
  },
  {
    accessorKey: "observaciones",
    header: "Observaciones",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
        {row.original.observaciones}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions proyecto={row.original} />,
  },
]
