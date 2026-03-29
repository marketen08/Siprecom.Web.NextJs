"use client"

import { use, useState } from "react"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"

import { useGetPlanillaEstructura } from "@/features/planillas/api/use-get-planilla-estructura"
import { SeccionPanel } from "@/features/planilla-builder/components/seccion-panel"
import { CampoCard } from "@/features/planilla-builder/components/campo-card"
import { AddCampoModal } from "@/features/planilla-builder/components/add-campo-modal"

import { Button } from "@/components/ui/button"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PlanillaBuilderPage({ params }: PageProps) {
  const { id } = use(params)
  const { data: estructuraResult, isLoading } = useGetPlanillaEstructura(id)

  const [selectedSeccionId, setSelectedSeccionId] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)

  // Backend returns ServiceResult<PlanillaEstructuraDTO> — extract the data property
  const estructura = (estructuraResult as any)?.data ?? estructuraResult

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Cargando planilla...
      </div>
    )
  }

  if (!estructura) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Planilla no encontrada.
      </div>
    )
  }

  const { planilla, secciones, campos } = estructura as {
    planilla: any
    secciones: any[]
    campos: any[]
  }

  const camposEnSeccion = campos.filter((c) =>
    selectedSeccionId === null
      ? !c.planillaSeccionId
      : c.planillaSeccionId === selectedSeccionId
  )

  const existingCampoIds = campos.map((c) => c.campoId)
  const nextOrden = camposEnSeccion.length + 1

  return (
    <>
      <AddCampoModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        planillaId={id}
        secciones={secciones}
        selectedSeccionId={selectedSeccionId}
        existingCampoIds={existingCampoIds}
        nextOrden={nextOrden}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/alcance/planillas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{planilla.nombre}</h1>
            {planilla.descripcion && (
              <p className="text-sm text-muted-foreground mt-0.5">{planilla.descripcion}</p>
            )}
          </div>
        </div>

        {/* Builder layout */}
        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* Left: Secciones */}
          <div className="w-56 shrink-0 border rounded-lg p-3 bg-white overflow-hidden flex flex-col">
            <SeccionPanel
              planillaId={id}
              secciones={secciones}
              selectedSeccionId={selectedSeccionId}
              onSelect={setSelectedSeccionId}
            />
          </div>

          {/* Right: Campos */}
          <div className="flex-1 border rounded-lg bg-white overflow-hidden flex flex-col">
            {/* Campos header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  {selectedSeccionId
                    ? secciones.find((s) => s.id === selectedSeccionId)?.nombre ?? "Sección"
                    : "Sin sección"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {camposEnSeccion.length} campo{camposEnSeccion.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-blue-900 hover:bg-blue-800"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Agregar campo
              </Button>
            </div>

            {/* Campos list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {camposEnSeccion.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <p className="text-sm">No hay campos en esta sección.</p>
                  <p className="text-xs mt-1">Hacé clic en "Agregar campo" para comenzar.</p>
                </div>
              ) : (
                camposEnSeccion
                  .sort((a, b) => a.orden - b.orden)
                  .map((campo) => (
                    <CampoCard key={campo.id} campo={campo} planillaId={id} />
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
