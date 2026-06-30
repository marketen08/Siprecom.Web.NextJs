"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle, CheckCircle2, ChevronLeft, Download,
  Loader2, Plus, Trash2, XCircle,
} from "lucide-react"

import {
  descargarDatabook,
  useEliminarDatabook,
  useGetDatabookJobs,
} from "@/features/databook/api/use-databook"
import { EstadoDatabookJob, type DatabookJob } from "@/features/databook/types"

import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function fmtBytes(b: number | null): string {
  if (!b) return "—"
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default function DatabookHistorialPage() {
  const { data, isLoading, isFetching, error } = useGetDatabookJobs()
  const eliminar = useEliminarDatabook()

  const [confirmDelete, setConfirmDelete] = useState<DatabookJob | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const jobs = data ?? []
  const activos = jobs.filter(
    (j) =>
      j.estado === EstadoDatabookJob.PENDIENTE ||
      j.estado === EstadoDatabookJob.EN_PROCESO,
  )

  async function handleDescargar(j: DatabookJob) {
    setActionError(null)
    setDownloadingId(j.id)
    try {
      await descargarDatabook(j.id)
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleEliminar() {
    if (!confirmDelete) return
    setActionError(null)
    try {
      await eliminar.mutateAsync(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/reporte/databook"
            className="text-sm text-blue-700 hover:underline inline-flex items-center gap-1.5 mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Generar nuevo
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Mis Databooks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Historial de databooks generados. {activos.length > 0 && (
              <span className="text-blue-700 font-medium">
                {activos.length} en curso · actualizando cada 5 segundos
                {isFetching && <Loader2 className="inline h-3 w-3 animate-spin ml-1.5" />}
              </span>
            )}
          </p>
        </div>
        <Button asChild className="bg-blue-900 hover:bg-blue-800 gap-1.5 shrink-0">
          <Link href="/reporte/databook"><Plus className="h-4 w-4" /> Nuevo databook</Link>
        </Button>
      </div>

      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Error al cargar el listado.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline-block" />
          <span className="ml-2">Cargando...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">Todavía no generaste ningún databook.</p>
          <Button asChild className="bg-blue-900 hover:bg-blue-800 gap-1.5">
            <Link href="/reporte/databook"><Plus className="h-4 w-4" /> Generar el primero</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28px]"></TableHead>
                <TableHead>SubSistema</TableHead>
                <TableHead>Filtros</TableHead>
                <TableHead>Solicitado</TableHead>
                <TableHead>Estado / Progreso</TableHead>
                <TableHead>Páginas / Peso</TableHead>
                <TableHead className="text-right w-[160px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => <FilaJob
                key={j.id}
                job={j}
                onDescargar={() => handleDescargar(j)}
                onEliminar={() => setConfirmDelete(j)}
                downloading={downloadingId === j.id}
              />)}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el databook?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a borrar el registro y el PDF generado.
              {confirmDelete?.subSistemaCodigo && (
                <span className="block mt-2 font-medium text-foreground">
                  {confirmDelete.subSistemaCodigo} — {confirmDelete.subSistemaNombre}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-red-600 hover:bg-red-700"
              disabled={eliminar.isPending}
            >
              {eliminar.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FilaJob({
  job, onDescargar, onEliminar, downloading,
}: {
  job: DatabookJob
  onDescargar: () => void
  onEliminar: () => void
  downloading: boolean
}) {
  const icono = (() => {
    switch (job.estado) {
      case EstadoDatabookJob.COMPLETADO: return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case EstadoDatabookJob.EN_PROCESO: return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case EstadoDatabookJob.ERROR:      return <XCircle className="h-4 w-4 text-red-600" />
      default:                            return <AlertCircle className="h-4 w-4 text-amber-500" />
    }
  })()

  return (
    <TableRow>
      <TableCell className="align-top pt-3">{icono}</TableCell>
      <TableCell className="align-top">
        <div className="text-sm font-medium text-gray-900">
          {job.subSistemaCodigo} — {job.subSistemaNombre}
        </div>
        {job.sistemaCodigo && (
          <div className="text-xs text-muted-foreground">
            Sistema: {job.sistemaCodigo}{job.sistemaNombre ? ` — ${job.sistemaNombre}` : ""}
          </div>
        )}
      </TableCell>
      <TableCell className="align-top text-xs text-muted-foreground space-y-0.5">
        {job.nivelNombre && <div>Nivel: {job.nivelNombre}</div>}
        {job.especialidadNombre && <div>Especialidad: {job.especialidadNombre}</div>}
        {!job.nivelNombre && !job.especialidadNombre && <span>Todos</span>}
      </TableCell>
      <TableCell className="align-top text-xs">
        <div className="text-gray-700">{job.solicitadoPorNombre ?? "—"}</div>
        <div className="text-muted-foreground">{fmtFecha(job.creadoEn)}</div>
      </TableCell>
      <TableCell className="align-top">
        <div className="text-sm">{job.estadoTexto}</div>
        {job.estado === EstadoDatabookJob.EN_PROCESO && (
          <>
            <div className="text-xs text-muted-foreground mt-0.5">{job.mensajeProgreso ?? "Procesando..."}</div>
            {job.registrosTotales != null && job.registrosTotales > 0 && (
              <div className="mt-1.5">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-40">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${job.porcentajeAvance}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {job.registrosProcesados ?? 0} / {job.registrosTotales} registros
                </div>
              </div>
            )}
          </>
        )}
        {job.estado === EstadoDatabookJob.ERROR && job.mensajeError && (
          <div className="text-xs text-red-700 mt-0.5 max-w-[280px] line-clamp-3">
            {job.mensajeError}
          </div>
        )}
      </TableCell>
      <TableCell className="align-top text-xs text-muted-foreground tabular-nums">
        {job.estado === EstadoDatabookJob.COMPLETADO ? (
          <>
            <div>{(job.paginasTotal ?? 0).toLocaleString("es-AR")} pág</div>
            <div>{fmtBytes(job.tamanioBytes)}</div>
          </>
        ) : "—"}
      </TableCell>
      <TableCell className="align-top text-right">
        <div className="inline-flex gap-1.5 justify-end">
          {job.puedeDescargar && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDescargar}
              disabled={downloading}
              className="gap-1"
            >
              {downloading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
              Descargar
            </Button>
          )}
          {job.estado !== EstadoDatabookJob.EN_PROCESO && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onEliminar}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
