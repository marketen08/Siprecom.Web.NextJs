"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { AlertCircle, ArrowRight, CalendarClock, FileText, Layers, ListChecks, Loader2 } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetAvanceSubsistema } from "@/features/avance/api/use-get-avance-subsistema"
import { useGetTestGroups } from "@/features/testgroups/api/use-get-testgroups"
import { ESTADO_TEST_GROUP, type TestGroup } from "@/features/testgroups/types"
import { fetchPlanoUrl } from "@/features/subsistemas/api/use-subsistema-plano"
import { NivelesDetalle, ProximaMetaCelda } from "@/features/avance/components/niveles-cells"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function DetalleSubsistemaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { id } = params
  const { data, isLoading } = useGetAvanceSubsistema(id)
  const ss = data?.data
  // Test Groups del subsistema — traemos todos (pageSize alto) porque acá se
  // resume el estado, no se pagina. Un subsistema típico tiene decenas, no cientos.
  const { data: testGroupsRaw, isLoading: loadingTG } = useGetTestGroups({
    subSistemaId: id,
    pageSize: 200,
  })
  // `PagedResponse<T>` expone `data: T[]` directamente — no viene envuelto.
  // BORRADOR se oculta: es estado de armado/Alcance, no de ejecución.
  const testGroups: TestGroup[] = (testGroupsRaw?.data ?? [])
    .filter((tg) => tg.estado !== ESTADO_TEST_GROUP.BORRADOR)

  const [planoAbriendo, setPlanoAbriendo] = useState(false)
  const [planoError, setPlanoError] = useState<string | null>(null)

  async function abrirPlano() {
    if (!ss?.id) return
    setPlanoError(null)
    setPlanoAbriendo(true)
    try {
      const { url } = await fetchPlanoUrl(ss.id)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      setPlanoError((e as Error).message)
    } finally {
      setPlanoAbriendo(false)
    }
  }

  useBreadcrumb(
    ss
      ? [
          { label: "Ejecución" },
          { label: "Sistemas", href: "/ejecucion/sistemas" },
          { label: `${ss.sistemaCodigo ?? ""} — ${ss.sistemaNombre ?? ""}`, href: ss.sistemaId ? `/ejecucion/subsistemas?sistemaId=${ss.sistemaId}` : undefined },
          { label: `${ss.codigo} — ${ss.nombre}` },
        ]
      : null,
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando subsistema…
      </div>
    )
  }
  if (!ss) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        No se encontró el subsistema.
      </div>
    )
  }

  const tieneNiveles = (ss.niveles?.length ?? 0) > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-muted-foreground font-mono">{ss.sistemaCodigo} — {ss.sistemaNombre}</div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <span className="font-mono">{ss.codigo}</span>
            <span className="text-muted-foreground font-normal">·</span>
            <span>{ss.nombre}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <EstadosPopover avance={ss} />
        </div>
      </div>

      {planoError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {planoError}
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-4 space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avance total</div>
            <div className="text-sm font-medium text-gray-700 tabular-nums">
              {Number(ss.porcentajeAvance).toFixed(1)}%
            </div>
          </div>
          <BarraAvance porcentaje={ss.porcentajeAvance} size="lg" />
          <div className="text-xs text-muted-foreground">
            {ss.totalTareas} tarea(s) · {ss.completado + ss.firmado + ss.aprobado} terminales
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <CalendarClock className="h-3.5 w-3.5" /> Próxima meta
          </div>
          <ProximaMetaCelda niveles={ss.niveles} />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => router.push(`/ejecucion/elementos?subSistemaId=${ss.id}`)}
          className="gap-2"
        >
          <Layers className="h-4 w-4" /> Ver elementos
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={abrirPlano}
          disabled={!ss.tienePlano || planoAbriendo}
          className="gap-2"
        >
          {planoAbriendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {ss.tienePlano ? "Ver plano" : "Sin plano"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/reporte/listado-indice?subSistemaId=${ss.id}`)}
          className="gap-2"
        >
          <ListChecks className="h-4 w-4" /> Listado índice
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/reporte/pendientes?subSistemaId=${ss.id}`)}
          className="gap-2"
        >
          <AlertCircle className="h-4 w-4" /> Listado de pendientes
        </Button>
      </div>

      {/* Niveles planificados */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Niveles planificados
        </h2>
        {tieneNiveles ? (
          <NivelesDetalle niveles={ss.niveles!} />
        ) : (
          <div className="rounded-md border border-dashed bg-gray-50 p-6 text-sm text-muted-foreground text-center">
            Este subsistema no tiene niveles planificados.
          </div>
        )}
      </div>

      {/* Paquetes de prueba (TestGroups) del subsistema. Silencioso si no hay. */}
      {(loadingTG || testGroups.length > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
            Paquetes de prueba
            {!loadingTG && (
              <span className="text-xs font-normal text-muted-foreground">
                ({testGroups.length})
              </span>
            )}
          </h2>
          {loadingTG ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando paquetes…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {testGroups.map((tg) => (
                <TestGroupCard key={tg.id} tg={tg} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card compacta por TestGroup ─────────────────────────────────────────────

function TestGroupCard({ tg }: { tg: TestGroup }) {
  const pct = tg.porcentajeAvance ?? 0
  const estadoCls =
    tg.estado === ESTADO_TEST_GROUP.BORRADOR
      ? "border-gray-300 text-gray-700 bg-gray-50"
      : tg.estado === ESTADO_TEST_GROUP.ACTIVO
        ? "border-blue-300 text-blue-700 bg-blue-50"
        : tg.estado === ESTADO_TEST_GROUP.COMPLETADO
          ? "border-green-300 text-green-700 bg-green-50"
          : "border-slate-400 text-slate-700 bg-slate-100"
  return (
    <Link
      href={`/ejecucion/test-groups/${tg.id}`}
      className="rounded-lg border bg-white p-3 space-y-2 hover:border-blue-300 hover:shadow-sm transition-colors block"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs text-blue-700 font-semibold">{tg.codigo}</span>
            <Badge variant="secondary" className="h-5 text-[10px]">
              {tg.elementoTipoSinteticoNombre ?? "—"}
            </Badge>
          </div>
          <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{tg.nombre}</p>
        </div>
        <Badge variant="outline" className={`${estadoCls} h-5 text-[10px] shrink-0`}>
          {tg.estadoTexto}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full ${pct >= 100 ? "bg-green-600" : "bg-blue-600"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-gray-600 w-10 text-right">{pct.toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{tg.cantidadElementos} elemento(s)</span>
        <span>·</span>
        <span>{tg.cantidadTareasTerminales}/{tg.cantidadTareas} tarea(s)</span>
      </div>
    </Link>
  )
}
