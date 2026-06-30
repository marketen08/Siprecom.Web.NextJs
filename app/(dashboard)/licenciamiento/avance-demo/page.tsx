"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle, AlertTriangle, CheckCircle2, FlaskConical,
  Loader2, RefreshCw, Trash2, XCircle,
} from "lucide-react"

import {
  useBorrarAvanceDemo,
  useGenerarAvanceDemo,
  useGetAvanceDemoInspeccion,
  useGetAvanceDemoJob,
  EstadoDemoAvanceJob,
} from "@/features/mantenimiento/api/use-avance-demo"
import { useGetProyectosSelect } from "@/features/proyectos/api/use-get-proyectos-select"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

export default function AvanceDemoPage() {
  const [proyectoId, setProyectoId] = useState<string>("")
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const proyectosQ = useGetProyectosSelect()
  const proyectos  = proyectosQ.data?.data ?? []

  const proyectoSel = useMemo(
    () => proyectos.find((p) => p.id === proyectoId) ?? null,
    [proyectos, proyectoId],
  )

  const inspQ = useGetAvanceDemoInspeccion(proyectoId || null)
  const insp  = inspQ.data

  const generarMut = useGenerarAvanceDemo()
  const borrarMut  = useBorrarAvanceDemo()
  const jobQ       = useGetAvanceDemoJob(activeJobId)
  const job        = jobQ.data

  // Cuando el job activo termina, refrescamos la inspección para reflejar el nuevo estado.
  useEffect(() => {
    if (!job) return
    if (job.estado === EstadoDemoAvanceJob.COMPLETADO || job.estado === EstadoDemoAvanceJob.ERROR) {
      inspQ.refetch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.estado])

  async function handleGenerar() {
    if (!proyectoId) return
    const resp = await generarMut.mutateAsync(proyectoId)
    setActiveJobId(resp.jobId)
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <FlaskConical className="h-6 w-6 text-blue-700" />
          Avance demo del proyecto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Genera <strong>registros y pendientes de muestra</strong> sobre un proyecto que ya tenga
          estructura cargada (sistemas, subsistemas, elementos, tareas, planillas). Lo lleva a ~50% de
          avance respetando la secuencialidad por nivel (PRECOM antes que COM por subsistema).
          Útil para demos.
        </p>
      </div>

      {/* Selección de proyecto */}
      <Card className="p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-900">Proyecto</label>
          <Select value={proyectoId} onValueChange={(v) => setProyectoId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Elegí un proyecto">
                {proyectoSel?.nombre ?? "Elegí un proyecto"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {proyectos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {inspQ.isFetching && (
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Inspeccionando…
          </div>
        )}

        {insp && (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Kpi label="SubSistemas"          value={insp.subSistemas} />
            <Kpi label="Tareas"               value={insp.tareas} />
            <Kpi label="Tareas completadas"   value={insp.tareasCompletadas} />
            <Kpi label="Registros"            value={insp.registros} />
            <Kpi label="Pendientes"           value={insp.pendientes} />
            <Kpi label="Registros [DEMO]"     value={insp.registrosDemo}     sub />
            <Kpi label="Pendientes [DEMO]"    value={insp.pendientesDemo}    sub />
          </div>
        )}
      </Card>

      {/* Card: Generar avance demo */}
      <Card className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Generar avance demo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crea registros y pendientes para que el proyecto se vea con ~50% de avance.
            </p>
          </div>
          {insp && !insp.tieneAvance && insp.tieneEstructura && (
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" /> Listo para generar
            </Badge>
          )}
        </div>

        {insp && !insp.tieneEstructura && (
          <Aviso variante="warning"
            titulo="Falta estructura"
            mensaje="El proyecto no tiene subsistemas o tareas. Cargá primero la estructura antes de poder generar avance."
          />
        )}

        {insp && insp.tieneAvance && (
          <Aviso variante="warning"
            titulo="El proyecto ya tiene avance"
            mensaje={`Hay ${insp.tareasCompletadas} tareas completadas, ${insp.registros} registros y ${insp.pendientes} pendientes. Para regenerar, primero borrá los datos demo desde la sección de abajo.`}
          />
        )}

        <Button
          onClick={handleGenerar}
          disabled={
            !proyectoId
            || !insp
            || insp.tieneAvance
            || !insp.tieneEstructura
            || generarMut.isPending
            || (activeJobId !== null && job?.estado !== EstadoDemoAvanceJob.COMPLETADO && job?.estado !== EstadoDemoAvanceJob.ERROR)
          }
          className="bg-blue-700 hover:bg-blue-800 gap-1.5"
        >
          {generarMut.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <FlaskConical className="h-4 w-4" />}
          Generar avance demo
        </Button>

        {/* Progreso del job activo */}
        {activeJobId && job && <ProgresoJob job={job} />}
      </Card>

      {/* Card destructiva: Borrar datos demo */}
      <Card className="p-6 space-y-3 border-red-200">
        <div className="flex items-start gap-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-red-700">Zona peligrosa: borrar datos demo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Elimina los registros y pendientes marcados con <code className="rounded bg-red-50 px-1 text-red-700">[DEMO]</code> y
              resetea las ElementoTareas vinculadas a estado PENDIENTE. <strong>No toca datos cargados por humanos</strong>.
            </p>
          </div>
        </div>

        {insp && insp.registrosDemo === 0 && insp.pendientesDemo === 0 && (
          <Aviso variante="info"
            titulo="Nada para borrar"
            mensaje="Este proyecto no tiene registros ni pendientes marcados como [DEMO]."
          />
        )}

        {insp && (insp.registrosDemo > 0 || insp.pendientesDemo > 0) && (
          <p className="text-sm text-muted-foreground">
            Se van a eliminar <strong className="text-foreground">{insp.registrosDemo}</strong> registros y{" "}
            <strong className="text-foreground">{insp.pendientesDemo}</strong> pendientes.
          </p>
        )}

        <ConfirmActionDialog
          trigger={
            <span className="inline-flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" /> Borrar datos demo
            </span>
          }
          triggerClassName="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
          title="¿Borrar los datos demo del proyecto?"
          description={
            <>
              Vas a eliminar los registros y pendientes marcados como <code>[DEMO]</code> de{" "}
              <strong>{proyectoSel?.nombre ?? "—"}</strong> y resetear sus ElementoTareas a PENDIENTE.
              <br /><br />
              Para confirmar, escribí el <strong>nombre exacto del proyecto</strong> abajo.
            </>
          }
          confirmText="Borrar datos demo"
          pendingText="Borrando..."
          variant="destructive"
          confirmPhrase={proyectoSel?.nombre ?? "—"}
          onConfirm={async () => {
            if (!proyectoId || !proyectoSel) return
            await borrarMut.mutateAsync({
              proyectoId,
              confirmacionNombreProyecto: proyectoSel.nombre,
            })
          }}
        />

        {borrarMut.isSuccess && borrarMut.data && (
          <Aviso variante="success"
            titulo="Datos demo eliminados"
            mensaje={`${borrarMut.data.registrosEliminados} registros eliminados · ${borrarMut.data.pendientesEliminados} pendientes eliminados · ${borrarMut.data.tareasResetadas} tareas reseteadas a PENDIENTE.`}
          />
        )}

        <p className="text-xs text-muted-foreground">
          El botón se habilita solo si escribís exactamente el nombre del proyecto.
        </p>
      </Card>
    </div>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function Kpi({ label, value, sub }: { label: string; value: number; sub?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${sub ? "border-amber-200 bg-amber-50/40" : "border-gray-200 bg-gray-50"}`}>
      <div className={`text-xs ${sub ? "text-amber-700" : "text-muted-foreground"}`}>{label}</div>
      <div className={`text-lg font-bold tabular-nums ${sub ? "text-amber-900" : "text-gray-900"}`}>
        {value.toLocaleString("es-AR")}
      </div>
    </div>
  )
}

function Aviso({ variante, titulo, mensaje }: {
  variante: "info" | "warning" | "success"
  titulo: string
  mensaje: string
}) {
  const styles = {
    info:    { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-900",   icon: "text-blue-600",   Icon: AlertCircle },
    warning: { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-900",  icon: "text-amber-600",  Icon: AlertTriangle },
    success: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", icon: "text-emerald-600", Icon: CheckCircle2 },
  }[variante]
  const { Icon } = styles
  return (
    <div className={`flex items-start gap-2 rounded-md border ${styles.border} ${styles.bg} p-3 text-sm ${styles.text}`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${styles.icon}`} />
      <div>
        <div className="font-semibold">{titulo}</div>
        <div className="text-xs mt-0.5">{mensaje}</div>
      </div>
    </div>
  )
}

function ProgresoJob({ job }: {
  job: NonNullable<ReturnType<typeof useGetAvanceDemoJob>["data"]>
}) {
  const enCurso = job.estado === EstadoDemoAvanceJob.PENDIENTE || job.estado === EstadoDemoAvanceJob.EN_PROCESO

  return (
    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/40 p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          {enCurso && <Loader2 className="h-4 w-4 animate-spin text-blue-700" />}
          {job.estado === EstadoDemoAvanceJob.COMPLETADO && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {job.estado === EstadoDemoAvanceJob.ERROR && <XCircle className="h-4 w-4 text-red-600" />}
          {job.estadoTexto}
          {enCurso && <span className="text-xs text-muted-foreground">· paso {job.pasoActual}/{job.totalPasos}</span>}
        </span>
        {enCurso && (
          <span className="text-xs text-muted-foreground tabular-nums">{job.porcentajeAvance}%</span>
        )}
      </div>

      {enCurso && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200/50">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${job.porcentajeAvance}%` }}
          />
        </div>
      )}

      {job.mensajeProgreso && (
        <div className="text-xs text-muted-foreground">{job.mensajeProgreso}</div>
      )}

      {job.estado === EstadoDemoAvanceJob.COMPLETADO && (
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <span><strong>{job.registrosCreados ?? 0}</strong> registros creados</span>
          <span><strong>{job.tareasCompletadas ?? 0}</strong> tareas completadas</span>
          <span><strong>{job.fechasRedistribuidas ?? 0}</strong> fechas redistribuidas</span>
          <span><strong>{job.pendientesCreados ?? 0}</strong> pendientes creados</span>
        </div>
      )}

      {job.estado === EstadoDemoAvanceJob.ERROR && job.mensajeError && (
        <div className="text-xs text-red-700">{job.mensajeError}</div>
      )}
    </div>
  )
}
