"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Eraser, Loader2, Play, RefreshCcw, Settings2 } from "lucide-react"

import {
  useGenerarPlanificacion,
  useLimpiarManualesFuturas,
} from "@/features/planificacion/api/use-planificacion"
import type {
  CambioFechaPlanificada,
  GenerarPlanificacionResult,
} from "@/features/planificacion/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

function fmt(n: number) {
  return n.toLocaleString("es-AR")
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })
  } catch {
    return iso
  }
}

export default function GeneradorPage() {
  const hoy = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])

  const [fechaInicio, setFechaInicio] = useState<string>(hoy)
  const [incluirAtrasadas, setIncluirAtrasadas] = useState(true)
  const [permitirExcederVentana, setPermitirExcederVentana] = useState(true)
  const [reasignarManualesFuturas, setReasignarManualesFuturas] = useState(false)
  const [preview, setPreview] = useState<GenerarPlanificacionResult | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLimpiarOpen, setConfirmLimpiarOpen] = useState(false)
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mut = useGenerarPlanificacion()
  const limpiar = useLimpiarManualesFuturas()

  async function previsualizar() {
    setError(null)
    setAppliedMsg(null)
    try {
      const resp = await mut.mutateAsync({
        fechaInicio, dryRun: true, incluirAtrasadas, permitirExcederVentana, reasignarManualesFuturas,
      })
      setPreview(resp.data)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function aplicar() {
    setError(null)
    try {
      const resp = await mut.mutateAsync({
        fechaInicio, dryRun: false, incluirAtrasadas, permitirExcederVentana, reasignarManualesFuturas,
      })
      setPreview(resp.data)
      setAppliedMsg(
        `${resp.data.tareasAsignadas} tareas asignadas. Fin estimado: ${fmtFecha(resp.data.fechaFinEstimada)}.`,
      )
      setConfirmOpen(false)
    } catch (e) {
      setError((e as Error).message)
      setConfirmOpen(false)
    }
  }

  async function ejecutarLimpiar() {
    setError(null)
    setAppliedMsg(null)
    try {
      const resp = await limpiar.mutateAsync()
      const n = resp.data ?? 0
      setAppliedMsg(
        n > 0
          ? `Se limpiaron ${n} fechas manuales futuras. Corré el generador para reasignarlas.`
          : "No había fechas manuales futuras para limpiar.",
      )
      setPreview(null)
      setConfirmLimpiarOpen(false)
    } catch (e) {
      setError((e as Error).message)
      setConfirmLimpiarOpen(false)
    }
  }

  const cantAtrasadas = preview?.cambios.filter((c) => c.esAtrasada).length ?? 0
  const cantExceden = preview?.cambios.filter((c) => c.excedeVentana).length ?? 0
  const cantManualesFuturas = preview?.cambios.filter((c) => c.eraManualFutura).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generador de planificación</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Asigna <code className="text-xs">FechaPlanificada</code> distribuyendo por capacidad.
            Respeta las fechas <strong>Manual + futuras</strong>; reasigna las <strong>Generadas</strong> y las
            Manual vencidas.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={() => setConfirmLimpiarOpen(true)}
            disabled={limpiar.isPending}
          >
            <Eraser className="h-4 w-4" />
            Limpiar fechas manuales
          </Button>
          <Link href="/planificacion/configuracion">
            <Button variant="outline" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Configurar capacidad
            </Button>
          </Link>
        </div>
      </div>

      {/* Input */}
      <div className="rounded-lg border border-gray-100 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Fecha de inicio</label>
            <Input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value)
                setPreview(null)
                setAppliedMsg(null)
              }}
              className="mt-1 w-44"
            />
          </div>
          <Button onClick={previsualizar} disabled={mut.isPending} className="gap-2">
            {mut.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCcw className="h-4 w-4" />}
            {mut.isPending ? "Calculando..." : "Previsualizar"}
          </Button>
          {preview && preview.cambios.length > 0 && !preview.aplicado && (
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={mut.isPending}
              className="gap-2 bg-green-700 hover:bg-green-800"
            >
              <Play className="h-4 w-4" />
              Aplicar planificación
            </Button>
          )}
        </div>

        {/* Toggle: reprogramar atrasadas */}
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={incluirAtrasadas}
            onChange={(e) => {
              setIncluirAtrasadas(e.target.checked)
              setPreview(null)
              setAppliedMsg(null)
            }}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">
            <span className="font-medium text-gray-900">Reprogramar tareas con ventana vencida</span>
            <span className="block text-xs text-muted-foreground">
              Si una tarea tiene su ventana <code className="text-[10px]">SubSistemaNivel</code> ya
              terminada (atrasada), se reprograma desde la fecha de inicio ignorando la ventana
              original. Aparece marcada con <span className="px-1 py-0.5 bg-amber-100 text-amber-800 rounded">Atrasada</span> en el diff.
            </span>
          </span>
        </label>

        {/* Toggle: empujar fuera de la ventana cuando se llena */}
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={permitirExcederVentana}
            onChange={(e) => {
              setPermitirExcederVentana(e.target.checked)
              setPreview(null)
              setAppliedMsg(null)
            }}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">
            <span className="font-medium text-gray-900">Permitir empujar fuera de la ventana</span>
            <span className="block text-xs text-muted-foreground">
              Si la capacidad dentro de la ventana <code className="text-[10px]">SubSistemaNivel</code> se
              agota, las tareas restantes se empujan más allá del fin de la ventana hasta encontrar
              capacidad. El cronograma final puede exceder la planificación oficial — aparecen marcadas
              con <span className="px-1 py-0.5 bg-orange-100 text-orange-800 rounded">Excede ventana</span>.
              Si la dejás desactivada, esas tareas quedan sin asignar.
            </span>
          </span>
        </label>

        {/* Toggle: sobrescribir fechas Manual + futuras (destructivo) */}
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reasignarManualesFuturas}
            onChange={(e) => {
              setReasignarManualesFuturas(e.target.checked)
              setPreview(null)
              setAppliedMsg(null)
            }}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">
            <span className="font-medium text-red-700">Sobrescribir fechas manuales futuras (destructivo)</span>
            <span className="block text-xs text-muted-foreground">
              Normalmente las tareas con fecha cargada a mano y aún por venir se respetan. Al
              activar esto entran al pool del generador y pueden moverse — aparecen marcadas
              con <span className="px-1 py-0.5 bg-red-100 text-red-800 rounded">Manual reasignada</span>.
              Vas a perder esas fechas. Usalo solo si las cargaste mal o querés re-distribuir todo.
            </span>
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {appliedMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{appliedMsg}</span>
        </div>
      )}

      {/* Resultado */}
      {preview && (
        <>
          {/* Banner destacado: manuales vencidas que se van a sobrescribir */}
          {preview.manualesVencidasReasignadas > 0 && (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-900 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                Atención: {fmt(preview.manualesVencidasReasignadas)} fechas manuales vencidas se van a sobrescribir
              </div>
              <p className="text-sm text-red-800 mt-1">
                Tenías esas fechas cargadas a mano pero ya pasaron. El generador las reemplaza por
                fechas futuras. Si alguna debe quedar fija, primero editala manualmente a una fecha
                futura antes de aplicar.
              </p>
            </div>
          )}

          {/* Banner destacado: manuales FUTURAS que se van a sobrescribir */}
          {preview.manualesFuturasReasignadas > 0 && (
            <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-900 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                Atención: {fmt(preview.manualesFuturasReasignadas)} fechas manuales futuras se van a sobrescribir
              </div>
              <p className="text-sm text-red-800 mt-1">
                Activaste <em>"Sobrescribir fechas manuales futuras"</em>. Esas tareas tenían
                fechas cargadas a mano que aún no habían llegado — el generador las va a reemplazar
                por una distribución por capacidad. Si alguna era importante, desactivá el toggle
                antes de aplicar.
              </p>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Manual + futura (fijas)"
              value={fmt(preview.tareasFijas)}
              sub="No se modifican"
            />
            <KpiCard
              label={preview.aplicado ? "Asignadas" : "A asignar"}
              value={fmt(preview.tareasAsignadas)}
              sub={preview.aplicado ? "Persistidas" : "Preview, sin aplicar"}
              highlight
            />
            <KpiCard
              label="Sin asignar"
              value={fmt(preview.tareasSinAsignar)}
              sub="Ver warnings"
              warn={preview.tareasSinAsignar > 0}
            />
            <KpiCard
              label="Fin estimado"
              value={fmtFecha(preview.fechaFinEstimada)}
              sub="Último día asignado"
            />
          </div>

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Atención
              </div>
              <ul className="text-sm text-amber-800 space-y-0.5 list-disc list-inside">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Tabla de cambios */}
          {preview.cambios.length > 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white p-4 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {preview.aplicado ? "Cambios aplicados" : "Diff propuesto"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {preview.aplicado
                    ? `Se asignó FechaPlanificada a ${preview.cambios.length} tarea(s).`
                    : `Se asignará FechaPlanificada a ${preview.cambios.length} tarea(s) cuando aprietes "Aplicar planificación".`}
                  {cantAtrasadas > 0 && (
                    <span className="ml-1 text-amber-700">
                      {cantAtrasadas} de ellas estaba(n) atrasada(s) y se reprograma(n) ignorando su ventana original.
                    </span>
                  )}
                  {cantExceden > 0 && (
                    <span className="ml-1 text-orange-700">
                      {cantExceden} se empuja(n) más allá del fin de su ventana SubSistemaNivel por falta de capacidad.
                    </span>
                  )}
                  {cantManualesFuturas > 0 && (
                    <span className="ml-1 text-red-700">
                      {cantManualesFuturas} tenía(n) fecha manual futura que va(n) a perderse.
                    </span>
                  )}
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">TAG</TableHead>
                      <TableHead>Tarea</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Especialidad</TableHead>
                      <TableHead className="w-32 text-right">Fecha asignada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.cambios.slice(0, 200).map((c) => (
                      <CambioRow key={c.elementoTareaId} cambio={c} />
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.cambios.length > 200 && (
                <p className="text-xs text-muted-foreground text-center">
                  Mostrando las primeras 200 de {fmt(preview.cambios.length)} filas.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-muted-foreground">
              No hay tareas libres para asignar. Todas las tareas pendientes ya tienen{" "}
              <code className="text-xs">FechaPlanificada</code> cargada.
            </div>
          )}
        </>
      )}

      {/* Confirmación antes de limpiar las fechas manuales */}
      <AlertDialog open={confirmLimpiarOpen} onOpenChange={setConfirmLimpiarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpiar fechas manuales futuras</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a borrar la <strong>FechaPlanificada</strong> de todas las tareas del proyecto
              que tenían fecha cargada a mano y aún no llegó. Las fechas Manual <em>vencidas</em>
              no se tocan.
              <br /><br />
              Después de esto, corré el generador para que reasigne todas esas tareas desde cero
              según capacidad y ventanas. <strong className="text-red-700">No se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={limpiar.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={limpiar.isPending}
              onClick={(e) => { e.preventDefault(); ejecutarLimpiar() }}
            >
              {limpiar.isPending ? "Limpiando..." : "Limpiar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación antes de aplicar */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar planificación</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a asignar <strong>FechaPlanificada</strong> a{" "}
              <strong>{fmt(preview?.tareasAsignadas ?? 0)} tareas</strong>.
              {" "}Las fechas Manual + futuras ({fmt(preview?.tareasFijas ?? 0)}) no se modifican.
              {preview && preview.manualesVencidasReasignadas > 0 && (
                <>
                  <br /><br />
                  <strong className="text-red-700">{fmt(preview.manualesVencidasReasignadas)} fechas manuales vencidas se van a sobrescribir.</strong>
                </>
              )}
              <br /><br />
              Las fechas nuevas quedan marcadas como <em>Generada</em> — la próxima corrida del
              generador las puede mover. Para fijar una tarea a un día específico, editala desde
              su sheet de detalle (queda como <em>Manual</em>).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={mut.isPending}
              onClick={(e) => { e.preventDefault(); aplicar() }}
            >
              {mut.isPending ? "Aplicando..." : "Aplicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
  warn,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  warn?: boolean
}) {
  const valueColor = warn ? "text-amber-700" : highlight ? "text-green-700" : "text-blue-900"
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function CambioRow({ cambio }: { cambio: CambioFechaPlanificada }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{cambio.elementoTag ?? "—"}</TableCell>
      <TableCell className="text-sm">
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span>{cambio.tareaNombre ?? "—"}</span>
          {cambio.eraManualVencida && (
            <span
              className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-800 rounded font-medium"
              title="Tenías una fecha manual cargada que ya pasó. El generador la reemplaza."
            >
              Manual vencida
            </span>
          )}
          {cambio.esAtrasada && (
            <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded font-medium">
              Atrasada
            </span>
          )}
          {cambio.excedeVentana && (
            <span
              className="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-800 rounded font-medium"
              title="No había capacidad dentro de la ventana SubSistemaNivel. La tarea se asignó después del fin de la ventana."
            >
              Excede ventana
            </span>
          )}
          {cambio.eraManualFutura && (
            <span
              className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-800 rounded font-medium"
              title="La tarea tenía una FechaPlanificada cargada manualmente con fecha futura. El generador la sobrescribe porque activaste 'Sobrescribir fechas manuales futuras'."
            >
              Manual reasignada
            </span>
          )}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{cambio.nivelNombre ?? "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{cambio.especialidadNombre ?? "—"}</TableCell>
      <TableCell className="text-right text-sm">
        {cambio.fechaAnterior ? (
          <span className="inline-flex items-baseline gap-1.5">
            <span className="line-through text-gray-400 text-xs">{fmtFecha(cambio.fechaAnterior)}</span>
            <span className="font-medium">{fmtFecha(cambio.fechaNueva)}</span>
          </span>
        ) : (
          <span className="font-medium">{fmtFecha(cambio.fechaNueva)}</span>
        )}
      </TableCell>
    </TableRow>
  )
}
