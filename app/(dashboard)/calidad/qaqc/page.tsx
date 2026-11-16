"use client"

import Link from "next/link"
import { AlertOctagon, CheckCircle2, ChevronRight, ClipboardCheck, FileWarning, PenLine } from "lucide-react"

import { useAvance } from "@/features/qaqc/api/use-qaqc"
import { BarraAvance, Encabezado, nombreHoja, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import type { PieAvance } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"

/**
 * Avance de calidad por PIE: el equivalente del avance por subsistemas para QA/QC.
 * Avance = puntos firmados / (total − N/A), por PIE, por hoja y por etapa.
 */
export default function AvanceQaqcPage() {
  const { data, isLoading, error } = useAvance()
  const { gestion } = usePermisosQaqc()

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Avance por PIE"
        descripcion="Puntos firmados por todas las partes sobre el total de cada Plan de Inspección y Ensayo. Los puntos marcados como No aplica no cuentan."
      >
        <Button variant="outline" asChild><Link href="/calidad/qaqc/agenda">Puntos de inspección</Link></Button>
        <Button variant="outline" asChild><Link href="/calidad/qaqc/databook">Databook</Link></Button>
      </Encabezado>

      {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {data && data.pies.length === 0 && (
        <div className="rounded-lg border bg-white p-10 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium">El proyecto todavía no tiene PIE</p>
          <p className="mt-1 text-sm text-muted-foreground">Se agregan desde las plantillas del catálogo, al crear el proyecto o desde la configuración de QA/QC.</p>
          {gestion && <Button className="mt-4" asChild><Link href="/calidad/qaqc/configuracion">Agregar un PIE</Link></Button>}
        </div>
      )}

      {data && data.pies.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi titulo="Avance general" valor={`${data.porcentaje.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`} detalle={`${data.pies.length} PIE en el proyecto`} icono={<CheckCircle2 className="h-5 w-5 text-green-600" />} />
            <Kpi titulo="Puntos firmados" valor={`${data.puntosFirmados} / ${data.totalPuntos - data.puntosNoAplica}`} detalle={data.puntosNoAplica > 0 ? `${data.puntosNoAplica} no aplican` : "Ninguno marcado como No aplica"} icono={<PenLine className="h-5 w-5 text-blue-600" />} />
            <Kpi titulo="Listos para firmar" valor={String(data.listosParaFirmar)} detalle="Con sus registros firmados y sin HP pendiente antes" icono={<ClipboardCheck className="h-5 w-5 text-blue-600" />} />
            <Kpi titulo="HP pendientes" valor={String(data.hpPendientes)} detalle="Puntos de detención obligatoria sin firmar" icono={<AlertOctagon className="h-5 w-5 text-red-600" />} />
          </div>

          <div className="space-y-4">
            {data.pies.map((p) => <TarjetaPie key={p.id} pie={p} />)}
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ titulo, valor, detalle, icono }: { titulo: string; valor: string; detalle: string; icono: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">{titulo}{icono}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{valor}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{detalle}</div>
    </div>
  )
}

function TarjetaPie({ pie }: { pie: PieAvance }) {
  const cuentan = pie.totalPuntos - pie.puntosNoAplica
  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{pie.disciplina ?? pie.nombre}</h2>
            {pie.cerrado && <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Cerrado</span>}
          </div>
          <p className="text-sm text-muted-foreground">{pie.codigo} · {pie.nombre}</p>
        </div>
        <Button size="sm" asChild><Link href={`/calidad/qaqc/pie/${pie.id}`}>Abrir PIE <ChevronRight className="h-4 w-4" /></Link></Button>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-3">
          <BarraAvance porcentaje={pie.porcentaje} alto="h-3" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Firmados</dt><dd className="text-right tabular-nums font-medium">{pie.puntosFirmados} / {cuentan}</dd>
            <dt className="text-muted-foreground">No aplican</dt><dd className="text-right tabular-nums">{pie.puntosNoAplica}</dd>
            <dt className="text-muted-foreground">Listos para firmar</dt><dd className="text-right tabular-nums text-blue-700 font-medium">{pie.listosParaFirmar}</dd>
            <dt className="text-muted-foreground">HP pendientes</dt><dd className="text-right tabular-nums text-red-700 font-medium">{pie.hpPendientes}</dd>
            <dt className="text-muted-foreground">Registros sin firmar</dt><dd className="text-right tabular-nums">{pie.registrosSinFirmar}</dd>
          </dl>
          {pie.proximoHp && (
            <p className="flex gap-1.5 rounded-md border border-red-100 bg-red-50 p-2 text-xs text-red-800">
              <FileWarning className="h-4 w-4 shrink-0" />
              <span><strong>Próximo HP:</strong> {pie.proximoHp}</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
          {pie.hojas.map((h) => (
            <div key={h.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{nombreHoja(h)}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {h.puntosFirmados}/{h.totalPuntos - h.puntosNoAplica}{h.cerrada && <span className="ml-2 font-medium text-green-700">· firmas finales</span>}
                </span>
              </div>
              <BarraAvance porcentaje={h.porcentaje} />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {h.etapas.map((e, i) => (
                  <span
                    key={i}
                    title={`${e.numero ?? ""} ${e.nombre}: ${e.puntosFirmados}/${e.totalPuntos - e.puntosNoAplica} firmados`}
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] ${e.porcentaje >= 100 ? "border-green-200 bg-green-50 text-green-800" : e.porcentaje > 0 ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                  >
                    <span className="font-semibold">{e.numero}</span>
                    <span className="max-w-40 truncate">{e.nombre}</span>
                    <span className="tabular-nums">{Math.round(e.porcentaje)}%</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
