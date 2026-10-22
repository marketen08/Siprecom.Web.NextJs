"use client"

import Link from "next/link"
import { AlertTriangle, CheckCircle2, Clock, FileWarning, ShieldAlert } from "lucide-react"

import {
  useGetEstadoCalidad,
  type CalidadArea,
  type CalidadEtapa,
  type CalidadTramo,
} from "@/features/estadisticas/api/use-get-estado-calidad"
import { DonutDistribucion } from "@/features/estadisticas/components/donut-distribucion"
import { NC_ESTADO_LABEL } from "@/features/no-conformidades/types"

const LISTA = "/calidad/no-conformidades"

/**
 * Tablero del módulo de Calidad.
 *
 * El criterio de la pantalla: cada número es una puerta. Lo que se ve acá no se
 * mira y se cierra —se clickea y se cae en la lista ya filtrada por eso mismo—,
 * porque un tablero que obliga a volver a filtrar a mano lo que acabás de ver es un
 * tablero que se abre una vez por curiosidad y nunca más.
 *
 * Por eso lo accionable va arriba (vencidos, eficacias por medir, lo que frena
 * certificados) y las distribuciones abajo, como contexto.
 */
export default function EstadoCalidadPage() {
  const { data, isLoading, isError } = useGetEstadoCalidad()
  const t = data?.data

  if (isError) {
    return (
      <div className="space-y-4">
        <Encabezado />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar el tablero de calidad. Si el proyecto no tiene el módulo
          habilitado, no hay informes que mostrar.
        </div>
      </div>
    )
  }

  if (isLoading || !t) {
    return (
      <div className="space-y-4">
        <Encabezado />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      </div>
    )
  }

  const r = t.resumen

  return (
    <div className="space-y-4">
      <Encabezado />

      {/* ── Los números ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          titulo="Abiertos"
          valor={r.abiertos}
          descripcion="En algún paso del circuito"
          href={`${LISTA}?estado=abiertos`}
          icono={<FileWarning className="h-4 w-4" />}
        />
        <Kpi
          titulo="Vencidos"
          valor={r.vencidos}
          descripcion="Pasó la fecha de compromiso"
          href={`${LISTA}?vencidos=1`}
          icono={<AlertTriangle className="h-4 w-4" />}
          alerta={r.vencidos > 0}
        />
        <Kpi
          titulo="Eficacias por medir"
          valor={r.eficaciasVencidas}
          descripcion="Llegó la fecha de medición"
          href={`${LISTA}?eficacia=1`}
          icono={<Clock className="h-4 w-4" />}
          alerta={r.eficaciasVencidas > 0}
        />
        <Kpi
          titulo="Frenan certificados"
          valor={r.bloqueanCertificado}
          descripcion="Abiertos de un tipo bloqueante"
          href={`${LISTA}?estado=abiertos`}
          icono={<ShieldAlert className="h-4 w-4" />}
          alerta={r.bloqueanCertificado > 0}
        />
        <Kpi
          titulo="Cerrados (30 días)"
          valor={r.cerradosUltimos30}
          descripcion="Finalizados, sin contar cancelados"
          icono={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Un cero en "Vencidos" puede significar dos cosas muy distintas, y el
          tablero no debería dejar que se confundan. */}
      {r.sinCompromiso > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {r.sinCompromiso === 1
            ? "Hay 1 informe abierto sin fecha de compromiso, así que no entra en el conteo de vencidos."
            : `Hay ${r.sinCompromiso} informes abiertos sin fecha de compromiso, así que no entran en el conteo de vencidos.`}{" "}
          Son anteriores a que la fecha fuera obligatoria: se completa editándolos.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Embudo etapas={t.embudo} />
        <Antiguedad tramos={t.antiguedad} total={r.abiertos} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Areas areas={t.areas} />
        <Certificacion filas={t.certificacion} />
      </div>

      {/* ── Contexto ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DonutDistribucion
          titulo="Por tipo"
          descripcion="Informes abiertos"
          data={t.porTipo}
        />
        <DonutDistribucion
          titulo="Por severidad"
          descripcion="Informes abiertos"
          data={t.porSeveridad}
        />
        <DonutDistribucion
          titulo="Por motivo"
          descripcion="Origen del hallazgo · informes abiertos"
          data={t.porMotivo}
        />
      </div>
    </div>
  )
}

function Encabezado() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Estado de calidad</h1>
      <p className="text-sm text-muted-foreground mt-0.5">
        Qué está abierto, qué está atrasado y quién lo tiene. Cada número abre la
        lista filtrada por eso mismo.
      </p>
    </div>
  )
}

function Kpi({
  titulo,
  valor,
  descripcion,
  href,
  icono,
  alerta = false,
}: {
  titulo: string
  valor: number
  descripcion: string
  href?: string
  icono: React.ReactNode
  /** Pinta el número de rojo. Sólo cuando hay algo que hacer: un cero nunca alerta. */
  alerta?: boolean
}) {
  const contenido = (
    <>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={alerta ? "text-red-600" : ""}>{icono}</span>
        {titulo}
      </div>
      <div
        className={`mt-1 text-3xl font-bold tabular-nums ${alerta ? "text-red-600" : ""}`}
      >
        {valor}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{descripcion}</div>
    </>
  )

  const clases = "rounded-lg border bg-white p-3 shadow-sm"
  if (!href) return <div className={clases}>{contenido}</div>
  return (
    <Link href={href} className={`${clases} block transition hover:border-blue-300 hover:shadow`}>
      {contenido}
    </Link>
  )
}

/**
 * El embudo del circuito: dónde están parados los informes abiertos.
 *
 * Barras y no un donut porque las etapas son una secuencia, no categorías: lo que
 * interesa es ver dónde se acumula, y eso en un donut se pierde.
 */
function Embudo({ etapas }: { etapas: CalidadEtapa[] }) {
  const max = Math.max(1, ...etapas.map((e) => e.count))

  return (
    <Panel titulo="En qué etapa están" descripcion="Informes abiertos por paso del circuito">
      <div className="space-y-2">
        {etapas.map((e) => {
          const label = (e.estado && NC_ESTADO_LABEL[e.estado]) ?? e.estado ?? "—"
          return (
            <Link
              key={e.estadoId}
              href={`${LISTA}?estado=${e.estadoId}`}
              className="block rounded px-1 py-0.5 transition hover:bg-slate-50"
            >
              <div className="flex items-baseline justify-between text-sm">
                <span>{label}</span>
                <span className="tabular-nums">
                  {e.count}
                  {e.vencidos > 0 && (
                    <span className="ml-1.5 text-xs text-red-600">
                      {e.vencidos} vencido{e.vencidos === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                {/* Dos tramos en la misma barra: el total y, en rojo, la parte vencida. */}
                <div className="flex h-full" style={{ width: `${(e.count / max) * 100}%` }}>
                  <div
                    className="h-full bg-red-500"
                    style={{ width: e.count ? `${(e.vencidos / e.count) * 100}%` : "0%" }}
                  />
                  <div className="h-full flex-1 bg-blue-500" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </Panel>
  )
}

/**
 * Hace cuánto están abiertos. El tramo de más de 90 días es el que importa: un
 * informe que lleva un trimestre sin moverse dejó de ser trabajo en curso.
 */
function Antiguedad({ tramos, total }: { tramos: CalidadTramo[]; total: number }) {
  const max = Math.max(1, ...tramos.map((t) => t.count))

  return (
    <Panel
      titulo="Hace cuánto están abiertos"
      descripcion="Desde la fecha de detección"
    >
      {total === 0 ? (
        <Vacio texto="No hay informes abiertos." />
      ) : (
        <div className="space-y-2">
          {tramos.map((t) => (
            <div key={t.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{t.label}</span>
                <span className="tabular-nums">{t.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${t.desdeDias >= 91 ? "bg-red-500" : t.desdeDias >= 31 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${(t.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function Areas({ areas }: { areas: CalidadArea[] }) {
  return (
    <Panel
      titulo="Áreas afectadas"
      descripcion="Ordenadas por informes vencidos: tres atrasados pesan más que diez al día"
    >
      {areas.length === 0 ? (
        <Vacio texto="No hay informes abiertos." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-1 text-left font-medium">Área</th>
              <th className="pb-1 text-right font-medium">Abiertos</th>
              <th className="pb-1 text-right font-medium">Vencidos</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.grupoId} className="border-t">
                <td className="py-1.5">
                  <Link
                    href={`${LISTA}?area=${a.grupoId}`}
                    className="text-blue-700 underline-offset-2 hover:underline"
                  >
                    {a.nombre}
                  </Link>
                </td>
                <td className="py-1.5 text-right tabular-nums">{a.abiertos}</td>
                <td
                  className={`py-1.5 text-right tabular-nums ${a.vencidos > 0 ? "font-medium text-red-600" : "text-muted-foreground"}`}
                >
                  {a.vencidos}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

/**
 * Los subsistemas que no van a poder certificarse mientras el informe siga abierto.
 * Sólo aparecen los informes de un tipo marcado como bloqueante y con subsistema
 * cargado: sin subsistema no hay a qué imputarlo.
 */
function Certificacion({ filas }: { filas: { subSistemaId: string; nombre: string; count: number }[] }) {
  return (
    <Panel
      titulo="Frenan certificación"
      descripcion="Subsistemas con informes abiertos de un tipo bloqueante"
    >
      {filas.length === 0 ? (
        <Vacio texto="Ningún subsistema tiene informes bloqueantes abiertos." />
      ) : (
        <ul className="divide-y text-sm">
          {filas.map((f) => (
            <li key={f.subSistemaId} className="flex items-center justify-between py-1.5">
              <span>{f.nombre}</span>
              <span className="tabular-nums font-medium text-red-600">{f.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function Panel({
  titulo,
  descripcion,
  children,
}: {
  titulo: string
  descripcion?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="font-semibold text-gray-900">{titulo}</h3>
        {descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>}
      </div>
      {children}
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{texto}</div>
}
