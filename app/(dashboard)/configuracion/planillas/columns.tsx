"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, Check, Copy, Download, FileText, MoreHorizontal, Pencil, Settings, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import type { Planilla } from "@/features/planillas/types"
import { useOpenPlanilla } from "@/features/planillas/hooks/use-open-planilla"
import { useDeletePlanilla } from "@/features/planillas/api/use-delete-planilla"
import { useClonePlanilla } from "@/features/planillas/api/use-clone-planilla"
import { exportarPlanilla } from "@/features/planillas/api/use-import-export"
import { useMarcarRevision } from "@/features/planillas/api/use-marcar-revision"

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

/** Exportado porque las tarjetas de mobile usan el mismo menú que la fila del desktop:
    duplicarlo garantizaba que una acción nueva apareciera en uno y no en el otro. */
export function RowActions({ planilla }: { planilla: Planilla }) {
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

  // El backend ya resolvió si esta fila es editable (es de un equipo del usuario). Las
  // acciones que escriben se deshabilitan con el motivo a la vista: dejar que el error
  // aparezca al guardar es peor, porque se descubre con el trabajo ya hecho.
  //
  // Clonar, exportar y descargar quedan siempre: son de lectura, y clonar es justamente el
  // camino para tener una versión propia de una planilla ajena o global.
  const puedeEditar = planilla.puedeEditar !== false
  const motivoNoEditable = planilla.equipoNombre
    ? `La administra el equipo ${planilla.equipoNombre}`
    : "Es una planilla global: la administra un AdminGlobal"

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
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={!puedeEditar}
            title={puedeEditar ? undefined : motivoNoEditable}
            onClick={() => open(planilla.id)}
          >
            <Pencil className="h-4 w-4" />
            Editar datos
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push(`/configuracion/planillas/${planilla.id}`)}
          >
            <Settings className="h-4 w-4" />
            {/* El diseñador se abre igual: ver la planilla de otro equipo es lo que permite
                copiarla. Lo que corta las escrituras es el backend. */}
            {puedeEditar ? "Diseñar planilla" : "Ver diseño"}
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
            disabled={!puedeEditar}
            title={puedeEditar ? undefined : motivoNoEditable}
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
              Se creará una copia de <strong>{planilla.nombre}</strong> con todas sus secciones y campos. La nueva planilla tendrá el sufijo “(copia)” en el nombre.
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

// ─────────────────────────────────────────────────────────────────────────────
// Badges. Están acá y exportados porque los usan las dos vistas —la tabla del
// desktop y las tarjetas de mobile— y si cada una tuviera su copia, el día que
// cambie un color o un título quedarían distintas sin que nadie se entere.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tilde de "revisada", para ir siguiendo una actualización del catálogo. Tres estados:
 * pendiente (caja vacía), revisada (verde) y modificada después de revisar (ámbar).
 *
 * El click en la ámbar vuelve a marcarla —la reconfirma con fecha nueva— en vez de sacar el
 * tilde: si alguien la cambió y vos la volviste a mirar, lo que querés es dejarla en verde.
 */
export function RevisionCheck({ planilla }: { planilla: Planilla }) {
  const marcar = useMarcarRevision()
  const [error, setError] = useState<string | null>(null)

  const puedeEditar = planilla.puedeEditar !== false
  const tieneTilde = !!planilla.revisadaEn
  const modificada = tieneTilde && !!planilla.modificadaDespuesDeRevisar
  const vigente = tieneTilde && !modificada

  const quien = planilla.revisadaPorNombre ? ` por ${planilla.revisadaPorNombre}` : ""
  const cuando = tieneTilde ? formatFecha(planilla.revisadaEn ?? undefined) : ""
  const titulo = error
    ?? (!puedeEditar
      ? (tieneTilde ? `Revisada${quien} el ${cuando}` : "Pendiente de revisión")
      : vigente
        ? `Revisada${quien} el ${cuando}. Click para sacar el tilde.`
        : modificada
          ? `Modificada después de revisar (revisada${quien} el ${cuando}). Click para volver a darla por revisada.`
          : "Pendiente. Click para marcarla como revisada.")

  async function toggle() {
    setError(null)
    try {
      await marcar.mutateAsync({ id: planilla.id, revisada: !vigente })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const tono = error
    ? "border-red-400 bg-red-50 text-red-600"
    : vigente
      ? "border-emerald-500 bg-emerald-500 text-white"
      : modificada
        ? "border-amber-500 bg-amber-100 text-amber-700"
        : "border-gray-300 bg-white text-transparent hover:border-gray-400"

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={vigente ? true : modificada ? "mixed" : false}
      aria-label={titulo}
      title={titulo}
      disabled={!puedeEditar || marcar.isPending}
      onClick={toggle}
      className={
        "inline-flex h-5 w-5 items-center justify-center rounded border transition-colors "
        + "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 " + tono
      }
    >
      {modificada && !error ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3.5 w-3.5" />}
    </button>
  )
}

/** Cuántas tareas usan la planilla. `undefined` = el endpoint no lo manda. */
export function UsoBadge({ cantidad }: { cantidad?: number }) {
  // `undefined` no es lo mismo que 0: los selects no mandan el conteo, y ahí mostrar
  // "Sin uso" sería afirmar algo que el backend no dijo.
  if (cantidad === undefined) return <span className="text-xs text-muted-foreground">—</span>

  if (cantidad === 0) {
    return (
      <span
        className="inline-flex items-center rounded-full border border-dashed border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500"
        title="Ninguna tarea la usa. Se puede eliminar sin afectar nada."
      >
        Sin uso
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium tabular-nums text-emerald-800"
      title={`${cantidad} ${cantidad === 1 ? "tarea usa" : "tareas usan"} esta planilla`}
    >
      {cantidad}
    </span>
  )
}

/**
 * Equipo dueño. Dos ejes distintos en dos badges: el equipo dice de quién es la
 * planilla, las colecciones de qué tipo es. Verlos juntos es lo que explica por qué
 * una planilla no aparece en un proyecto: puede ser por cualquiera de los dos.
 */
export function EquipoBadge({ planilla }: { planilla: Planilla }) {
  if (!planilla.equipoId) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
        title="Global: la ve y la usa todo el mundo. La administra un AdminGlobal."
      >
        Global
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
      title={planilla.puedeEditar === false
        ? `La administra el equipo ${planilla.equipoNombre}`
        : "La administra tu equipo"}
    >
      {planilla.equipoNombre}
    </span>
  )
}

export function ColeccionesBadges({ planilla }: { planilla: Planilla }) {
  const grupos = planilla.grupos ?? []
  if (grupos.length === 0) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-500 italic"
        title="Sin colección — visible en todos los proyectos (comodín)."
      >
        Sin colección
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
}

export const columns: ColumnDef<Planilla>[] = [
  {
    id: "revision",
    header: () => <span title="Revisada">Rev.</span>,
    cell: ({ row }) => <RevisionCheck planilla={row.original} />,
  },
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
    header: "Colecciones",
    cell: ({ row }) => <ColeccionesBadges planilla={row.original} />,
  },
  {
    id: "equipo",
    header: "Equipo",
    cell: ({ row }) => <EquipoBadge planilla={row.original} />,
  },
  {
    id: "uso",
    header: "Tareas",
    cell: ({ row }) => <UsoBadge cantidad={row.original.cantidadTareas} />,
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
