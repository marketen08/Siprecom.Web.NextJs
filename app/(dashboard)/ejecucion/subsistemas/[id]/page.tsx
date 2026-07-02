"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, CalendarClock, FileText, Layers, ListChecks, Loader2 } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetAvanceSubsistema } from "@/features/avance/api/use-get-avance-subsistema"
import { fetchPlanoUrl } from "@/features/subsistemas/api/use-subsistema-plano"
import { NivelesDetalle, ProximaMetaCelda } from "@/features/avance/components/niveles-cells"
import { BarraAvance } from "@/components/barra-avance"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { Button } from "@/components/ui/button"

export default function DetalleSubsistemaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { id } = params
  const { data, isLoading } = useGetAvanceSubsistema(id)
  const ss = data?.data

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
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={ss.sistemaId ? `/ejecucion/subsistemas?sistemaId=${ss.sistemaId}` : "/ejecucion/subsistemas"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="text-xs text-muted-foreground font-mono">{ss.sistemaCodigo} — {ss.sistemaNombre}</div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <span className="font-mono">{ss.codigo}</span>
              <span className="text-muted-foreground font-normal">·</span>
              <span>{ss.nombre}</span>
            </h1>
          </div>
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
    </div>
  )
}
