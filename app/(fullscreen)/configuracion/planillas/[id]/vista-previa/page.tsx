"use client"

import { use, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { useGetPlanillaEstructura } from "@/features/planillas/api/use-get-planilla-estructura"
import {
  CANAL_VISTA_PREVIA,
  useVersionDiseno,
  type MensajeVistaPrevia,
} from "@/features/planillas/api/use-vista-previa-planilla"
import { VistaPreviaPlanilla } from "@/features/planillas/components/vista-previa-planilla"

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Vista previa en una ventana aparte (para tenerla en un segundo monitor). Calcula su
 * propia huella del diseño; el diseñador le avisa por BroadcastChannel cuando hay un
 * cambio y esta ventana recarga la estructura, lo que regenera la vista previa.
 */
export default function VistaPreviaPlanillaPage({ params }: PageProps) {
  const { id } = use(params)
  const qc = useQueryClient()
  const { data } = useGetPlanillaEstructura(id)
  const version = useVersionDiseno(data)

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return
    const canal = new BroadcastChannel(CANAL_VISTA_PREVIA)
    canal.onmessage = (e: MessageEvent<MensajeVistaPrevia>) => {
      if (e.data?.planillaId === id)
        qc.invalidateQueries({ queryKey: ["planillas", id, "estructura"] })
    }
    return () => canal.close()
  }, [id, qc])

  const planilla = (data as { data?: { planilla?: { codigo?: string; nombre?: string } } })?.data?.planilla
  useEffect(() => {
    if (planilla?.nombre)
      document.title = `Vista previa · ${planilla.codigo ? `${planilla.codigo} - ` : ""}${planilla.nombre}`
  }, [planilla?.codigo, planilla?.nombre])

  return (
    <div className="h-[calc(100vh-4rem)] bg-white">
      <VistaPreviaPlanilla planillaId={id} version={version} enVentanaAparte />
    </div>
  )
}
