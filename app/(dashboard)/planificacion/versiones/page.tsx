"use client"

import { useState } from "react"
import Link from "next/link"
import { Anchor, Eye, Loader2, Pencil, Play, Trash2 } from "lucide-react"

import {
  useCrearBaseline,
  useGetVersionDetalle,
  useGetVersiones,
  useUpdateVersion,
  useDeleteVersion,
} from "@/features/planificacion/api/use-versiones"
import type {
  PlanificacionVersionListItem,
  PlanificacionVersionTareaSnapshot,
} from "@/features/planificacion/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

function fmtFecha(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function fmtFechaSimple(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })
  } catch {
    return iso
  }
}

export default function VersionesPage() {
  const { data, isLoading, error } = useGetVersiones()
  const versiones = data?.data ?? []

  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<PlanificacionVersionListItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PlanificacionVersionListItem | null>(null)
  const [opError, setOpError] = useState<string | null>(null)

  const detalle = useGetVersionDetalle(detalleId)
  const update = useUpdateVersion()
  const remove = useDeleteVersion()
  const crearBaseline = useCrearBaseline()

  const baselineExistente = versiones.find((v) => v.esBaseline) ?? null

  async function guardarEdicion(nombre: string, descripcion: string) {
    if (!editTarget) return
    setOpError(null)
    try {
      await update.mutateAsync({
        id: editTarget.id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
      })
      setEditTarget(null)
    } catch (e) {
      setOpError((e as Error).message)
    }
  }

  async function eliminar() {
    if (!confirmDelete) return
    setOpError(null)
    try {
      await remove.mutateAsync(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e) {
      setOpError((e as Error).message)
    }
  }

  async function generarBaseline() {
    setOpError(null)
    try {
      await crearBaseline.mutateAsync()
    } catch (e) {
      setOpError((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Versiones de planificación</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Snapshots históricos del cronograma. La versión <strong>P0 (baseline)</strong> es la
            promesa original — se congela al crearse y se usa de referencia en la curva S. Las
            siguientes (P1, P2, …) se crean automáticamente cada vez que aplicás el generador.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!isLoading && !baselineExistente && (
            <Button
              variant="default"
              className="gap-2"
              onClick={generarBaseline}
              disabled={crearBaseline.isPending}
            >
              <Anchor className="h-4 w-4" />
              {crearBaseline.isPending ? "Creando..." : "Crear baseline (P0)"}
            </Button>
          )}
          <Link href="/planificacion/generador">
            <Button variant="outline" className="gap-2">
              <Play className="h-4 w-4" />
              Ir al generador
            </Button>
          </Link>
        </div>
      </div>

      {!isLoading && !baselineExistente && versiones.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Este proyecto todavía no tiene <strong>baseline (P0)</strong>. La curva S va a mostrar
          solo la planificación actual y lo realizado, sin línea de comparación contra la promesa
          original. Podés crearlo desde el botón de arriba — se deriva de las ventanas{" "}
          <code className="text-xs">SubSistemaNivel</code>.
        </div>
      )}

      {opError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {opError}
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">N°</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-44">Creada</TableHead>
              <TableHead className="w-32">Por</TableHead>
              <TableHead className="w-28 text-right">Tareas</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-red-700">
                  Error al cargar las versiones.
                </TableCell>
              </TableRow>
            ) : versiones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay versiones aún. Aplicá el generador para crear la primera.
                </TableCell>
              </TableRow>
            ) : (
              versiones.map((v) => (
                <TableRow key={v.id} className={v.esBaseline ? "bg-blue-50/40" : undefined}>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-mono text-sm font-medium text-blue-900">
                      P{v.numero}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{v.nombre}</div>
                      {v.esBaseline && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded uppercase tracking-wide">
                          <Anchor className="h-3 w-3" />
                          Baseline
                        </span>
                      )}
                    </div>
                    {v.descripcion && (
                      <div className="text-xs text-muted-foreground mt-0.5">{v.descripcion}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{fmtFecha(v.createdAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.createdByNombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {v.cantidadTareas.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => setDetalleId(v.id)}
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => setEditTarget(v)}
                      title="Renombrar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-red-600 disabled:text-gray-300"
                      onClick={() => setConfirmDelete(v)}
                      disabled={v.esBaseline}
                      title={v.esBaseline
                        ? "No se puede eliminar la baseline (es la referencia de la curva S)."
                        : "Eliminar"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && versiones.length > 0 && (
        <p className="text-sm text-muted-foreground">{versiones.length} versión(es)</p>
      )}

      {/* Sheet: detalle de la versión */}
      <Sheet open={!!detalleId} onOpenChange={(v) => !v && setDetalleId(null)}>
        <SheetContent className="w-full sm:max-w-3xl! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {detalle.data?.data
                ? `P${detalle.data.data.numero} · ${detalle.data.data.nombre}`
                : "Detalle de versión"}
            </SheetTitle>
            <SheetDescription>
              {detalle.data?.data
                ? `Snapshot del cronograma creado el ${fmtFecha(detalle.data.data.createdAt)}.`
                : "Cargando..."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 px-4 pb-6">
            {detalle.isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline-block" />
                <span className="ml-2">Cargando snapshot...</span>
              </div>
            ) : detalle.data?.data ? (
              <DetalleTareasTabla tareas={detalle.data.data.tareas} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit sheet — key fuerza remount al cambiar target para resetear el state local */}
      <Sheet open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {editTarget && (
            <EditForm
              key={editTarget.id}
              target={editTarget}
              isPending={update.isPending}
              onCancel={() => setEditTarget(null)}
              onSave={guardarEdicion}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar versión</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar <strong>P{confirmDelete?.numero} · {confirmDelete?.nombre}</strong>?
              {" "}Esto es soft-delete: la versión deja de aparecer en el listado pero los datos
              persisten en la base. No afecta las FechaPlanificada actuales del proyecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => { e.preventDefault(); eliminar() }}
            >
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function EditForm({
  target,
  isPending,
  onCancel,
  onSave,
}: {
  target: PlanificacionVersionListItem
  isPending: boolean
  onCancel: () => void
  onSave: (nombre: string, descripcion: string) => void
}) {
  const [nombre, setNombre] = useState(target.nombre)
  const [descripcion, setDescripcion] = useState(target.descripcion ?? "")

  return (
    <>
      <SheetHeader>
        <SheetTitle>Renombrar versión</SheetTitle>
        <SheetDescription>
          P{target.numero} · {target.nombre}
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 px-4 space-y-3">
        <div>
          <label className="text-sm font-medium">Nombre</label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Replan tras paro de invierno"
            className="mt-1"
            maxLength={200}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Descripción</label>
          <Textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Notas opcionales sobre el motivo de esta versión..."
            className="mt-1"
            rows={4}
            maxLength={2000}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onSave(nombre, descripcion)}
            disabled={!nombre.trim() || isPending}
            className="flex-1"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </>
  )
}

function DetalleTareasTabla({ tareas }: { tareas: PlanificacionVersionTareaSnapshot[] }) {
  if (tareas.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Esta versión no tiene tareas snapshot.
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">TAG</TableHead>
            <TableHead>Tarea</TableHead>
            <TableHead className="w-32">Nivel</TableHead>
            <TableHead className="w-32">Especialidad</TableHead>
            <TableHead className="w-28 text-right">Fecha</TableHead>
            <TableHead className="w-20">Origen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tareas.slice(0, 500).map((t) => (
            <TableRow key={t.elementoTareaId}>
              <TableCell className="font-mono text-xs">{t.elementoTag ?? "—"}</TableCell>
              <TableCell className="text-sm">{t.tareaNombre ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{t.nivelNombre ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{t.especialidadNombre ?? "—"}</TableCell>
              <TableCell className="text-right text-sm font-medium">
                {fmtFechaSimple(t.fechaPlanificada)}
              </TableCell>
              <TableCell>
                {t.fechaPlanificadaOrigen === 1 ? (
                  <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded font-medium">
                    Generada
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded font-medium">
                    Manual
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {tareas.length > 500 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Mostrando 500 de {tareas.length} filas.
        </p>
      )}
    </div>
  )
}
