"use client"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { useGetAvanceHitosYFases } from "@/features/avance/api/use-get-avance-hitos-fases"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { BarraAvance } from "@/components/barra-avance"
import type {
  AvanceSistemaDTO, AvanceDTO, AvanceHitosFasesDTO, HitoCategoriaDTO, AvanceFaseDTO,
} from "@/features/avance/types"
import { ESTADO_PROYECTO } from "@/features/proyectos/types"

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-AR")
}

function nivelRiesgo(porcentaje: number): {
  label: string
  score: string
  className: string
} {
  const desvio = Math.max(0, 100 - porcentaje) / 100
  let score = 1
  if (desvio > 0.4) score = 5
  else if (desvio > 0.3) score = 4
  else if (desvio > 0.2) score = 3
  else if (desvio > 0.1) score = 2

  const map: Record<number, { label: string; className: string }> = {
    5: { label: "Crítico",  className: "bg-red-100 text-red-700" },
    4: { label: "Alto",     className: "bg-orange-100 text-orange-700" },
    3: { label: "Medio",    className: "bg-yellow-100 text-yellow-700" },
    2: { label: "Bajo",     className: "bg-blue-100 text-blue-700" },
    1: { label: "Muy bajo", className: "bg-green-100 text-green-700" },
  }
  return { ...map[score], score: score.toFixed(2) }
}

// ─── sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  badge,
}: {
  label: string
  value: string
  sub?: string
  badge?: { text: string; className: string }
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {badge && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </div>
      <span className="text-3xl font-bold text-blue-900 tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

function SistemaRow({ sistema }: { sistema: AvanceSistemaDTO }) {
  const ss: AvanceDTO[] = sistema.subSistemas ?? []
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* header del sistema */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs text-muted-foreground shrink-0">{sistema.codigo}</span>
          <span className="font-semibold text-sm text-gray-800 truncate">{sistema.nombre}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {fmt(sistema.completado + sistema.firmado + sistema.aprobado)}/{fmt(sistema.totalTareas)}
          </span>
          <div className="w-36">
            <BarraAvance porcentaje={sistema.porcentajeAvance} />
          </div>
        </div>
      </div>

      {/* subsistemas */}
      {ss.length > 0 && (
        <div className="divide-y divide-gray-50">
          {ss.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between gap-4 px-4 py-2 pl-8"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs text-gray-400 shrink-0">{sub.codigo}</span>
                <span className="text-sm text-gray-600 truncate">{sub.nombre}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {sub.pendiente > 0 && (
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {sub.pendiente} pend.
                    </span>
                  )}
                  {sub.enProceso > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                      {sub.enProceso} proc.
                    </span>
                  )}
                  {sub.aprobado > 0 && (
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      {sub.aprobado} apro.
                    </span>
                  )}
                </div>
                <div className="w-28">
                  <BarraAvance porcentaje={sub.porcentajeAvance} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Hitos + Fases ───────────────────────────────────────────────────────────

/**
 * Panel complementario al avance operativo. Muestra:
 * - Hitos: %packs terminales por categoría (RFC/RFSU/AOC).
 * - Fases: %tareas por Nivel del catálogo (Precom/Comm/…).
 *
 * No reemplaza el % de proyecto (tareas individuales), es una vista paralela.
 */
function HitosFasesPanel({
  hitosFases,
  isLoading,
}: {
  hitosFases: AvanceHitosFasesDTO | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-56" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  if (!hitosFases) return null

  const totalHitos =
    hitosFases.rfc.total + hitosFases.rfsu.total + hitosFases.aoc.total
  const hayFases = hitosFases.fases.length > 0

  if (totalHitos === 0 && !hayFases) return null

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-gray-800">
          Avance por hitos y fases
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Complemento al avance operativo — no lo reemplaza. Los hitos son los TestGroups
          terminales por categoría; las fases agrupan tareas por Nivel del catálogo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hitos */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Hitos (TestGroups)</h3>
            <span className="text-[11px] text-muted-foreground">
              % de packs terminales (Completado o Cerrado)
            </span>
          </div>
          {totalHitos === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              El proyecto todavía no tiene TestGroups cargados.
            </p>
          ) : (
            <div className="space-y-2.5">
              <HitoRow label="RFC" nombre="Ready For Commissioning" hito={hitosFases.rfc} />
              <HitoRow label="RFSU" nombre="Ready For Start-Up" hito={hitosFases.rfsu} />
              <HitoRow label="AOC" nombre="Acceptance Of Commissioning" hito={hitosFases.aoc} />
            </div>
          )}
        </div>

        {/* Fases */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Fases (por Nivel)</h3>
            <span className="text-[11px] text-muted-foreground">% de tareas terminadas</span>
          </div>
          {!hayFases ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Ninguna tarea del catálogo tiene Nivel asignado.
            </p>
          ) : (
            <div className="space-y-2.5">
              {hitosFases.fases.map((f) => (
                <FaseRow key={f.nivelId} fase={f} />
              ))}
              {hitosFases.tareasSinNivel > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  {fmt(hitosFases.tareasSinNivel)} tarea(s) sin Nivel asignado (no computan
                  en fases).
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HitoRow({
  label,
  nombre,
  hito,
}: {
  label: string
  nombre: string
  hito: HitoCategoriaDTO
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-24 shrink-0">
        <div className="font-mono text-xs font-semibold text-blue-800">{label}</div>
        <div className="text-[10px] text-muted-foreground truncate">{nombre}</div>
      </div>
      <div className="flex-1 min-w-0">
        <BarraAvance porcentaje={Number(hito.porcentaje)} />
      </div>
      <div className="min-w-24 text-right shrink-0">
        <div className="text-sm font-semibold tabular-nums text-gray-800">
          {Number(hito.porcentaje).toFixed(1)}%
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {fmt(hito.terminales)}/{fmt(hito.total)}
        </div>
      </div>
    </div>
  )
}

function FaseRow({ fase }: { fase: AvanceFaseDTO }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-32 shrink-0 truncate">
        <span className="text-xs font-medium text-gray-800">{fase.nivelNombre}</span>
      </div>
      <div className="flex-1 min-w-0">
        <BarraAvance porcentaje={Number(fase.porcentaje)} />
      </div>
      <div className="min-w-24 text-right shrink-0">
        <div className="text-sm font-semibold tabular-nums text-gray-800">
          {Number(fase.porcentaje).toFixed(1)}%
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {fmt(fase.completadas)}/{fmt(fase.total)}
        </div>
      </div>
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: perfil } = useGetPerfil()
  const { data: proyectosData } = useGetMisProyectos()
  const { data, isLoading } = useGetAvanceProyecto(perfil?.proyectoId)
  const { data: hitosFasesData, isLoading: isLoadingHitos } = useGetAvanceHitosYFases()

  const avance = data?.data
  const sistemas: AvanceSistemaDTO[] = avance?.sistemas ?? []
  const hitosFases = hitosFasesData?.data

  const proyectoActivo = proyectosData?.find((p) => p.esActivo)
  const estadoTexto = proyectoActivo
    ? ESTADO_PROYECTO[proyectoActivo.estado as keyof typeof ESTADO_PROYECTO] ?? "—"
    : "—"

  // KPIs calculados
  const pct = avance ? `${avance.porcentajeAvance.toFixed(1)}%` : "—"
  const completadas = avance
    ? avance.completado + avance.firmado + avance.aprobado
    : 0
  const riesgo = avance ? nivelRiesgo(avance.porcentajeAvance) : null

  return (
    <div className="space-y-6">
      {/* título */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-48" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {proyectoActivo?.nombre ?? "Sin proyecto activo"}
              {proyectoActivo && (
                <span className="ml-2 text-blue-700 font-medium">{estadoTexto}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Avance general"
            value={pct}
            sub={`${fmt(completadas)} de ${fmt(avance?.totalTareas ?? 0)} tareas completadas`}
            badge={
              riesgo
                ? { text: riesgo.label, className: riesgo.className }
                : undefined
            }
          />
          <KpiCard
            label="Tareas completadas"
            value={fmt(completadas)}
            sub={`Completado · Firmado · Aprobado`}
          />
          <KpiCard
            label="En proceso"
            value={fmt(avance?.enProceso ?? 0)}
            sub="Tareas iniciadas sin cerrar"
          />
          <KpiCard
            label="Pendientes"
            value={fmt(avance?.pendiente ?? 0)}
            sub={`${sistemas.length} sistemas · ${sistemas.reduce((acc, s) => acc + (s.subSistemas?.length ?? 0), 0)} subsistemas`}
          />
        </div>
      )}

      {/* separador */}
      <div className="border-t border-dashed border-gray-200" />

      {/* Hitos + fases (complementarios al avance operativo) */}
      <HitosFasesPanel hitosFases={hitosFases} isLoading={isLoadingHitos} />

      {/* separador */}
      <div className="border-t border-dashed border-gray-200" />

      {/* breakdown por sistema */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Avance por sistema</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Expandí cada sistema para ver el detalle por subsistema
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : sistemas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-muted-foreground">
            No hay datos de avance para el proyecto activo.
          </div>
        ) : (
          <div className="space-y-2">
            {sistemas.map((s) => (
              <SistemaRow key={s.id} sistema={s} />
            ))}
          </div>
        )}
      </div>

      {/* resumen de estados */}
      {avance && !isLoading && (
        <>
          <div className="border-t border-dashed border-gray-200" />
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-800">Resumen de estados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Pendiente",      value: avance.pendiente,  className: "bg-white text-gray-700 border-gray-200" },
                { label: "En proceso",     value: avance.enProceso,  className: "bg-blue-50 text-blue-700 border-blue-100" },
                { label: "Completado",     value: avance.completado, className: "bg-yellow-50 text-yellow-700 border-yellow-100" },
                { label: "Firmado",        value: avance.firmado,    className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                { label: "Firmado físico", value: avance.aprobado,   className: "bg-teal-50 text-teal-700 border-teal-100" },
                { label: "Rechazado",      value: avance.rechazado,  className: "bg-red-50 text-red-700 border-red-100" },
              ].map(({ label, value, className }) => (
                <div
                  key={label}
                  className={`rounded-lg border p-3 flex flex-col gap-0.5 ${className}`}
                >
                  <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
                  <span className="text-2xl font-bold tabular-nums">{fmt(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
