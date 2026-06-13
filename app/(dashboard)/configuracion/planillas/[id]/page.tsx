"use client"

import { use, useState } from "react"
import { Download, Pencil, Plus } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetPlanillaEstructura } from "@/features/planillas/api/use-get-planilla-estructura"
import { useOpenPlanilla } from "@/features/planillas/hooks/use-open-planilla"
import { useOpenSeccion } from "@/features/planillas/hooks/use-open-seccion"
import { EditPlanillaSheet } from "@/features/planillas/components/edit-planilla-sheet"
import { EditSeccionSheet } from "@/features/planillas/components/edit-seccion-sheet"
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
  const { open: openEditPlanilla } = useOpenPlanilla()
  const { open: openEditSeccion } = useOpenSeccion()

  // Backend returns ServiceResult<PlanillaEstructuraDTO> — extract the data property
  const estructura = (estructuraResult as any)?.data ?? estructuraResult
  const planillaNombre = (estructura as any)?.planilla?.nombre ?? null

  // Breadcrumb dinámico: Configuración → Planillas (link) → {nombre planilla}
  useBreadcrumb(
    planillaNombre
      ? [
          { label: "Configuración" },
          { label: "Planillas", href: "/configuracion/planillas" },
          { label: planillaNombre },
        ]
      : null
  )

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
      <EditPlanillaSheet />
      <EditSeccionSheet secciones={secciones} planillaId={id} />

      <div className="space-y-4">
        {/* Datos de la planilla */}
        <div className="rounded-lg border bg-white p-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {planilla.descripcion ? (
              <p className="text-sm text-muted-foreground">{planilla.descripcion}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin descripción</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* La planilla está "vacía" si no tiene secciones ni campos.
                En ese caso el PDF saldría sin contenido útil, así que deshabilitamos la descarga. */}
            {secciones.length === 0 && campos.length === 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled
                title="Agregá al menos una sección o un campo para descargar el PDF"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar PDF
              </Button>
            ) : (
              <a
                href={`/api/planillas/${id}/pdf/blanco`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Descargar PDF
                </Button>
              </a>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => openEditPlanilla(id)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar datos
            </Button>
          </div>
        </div>

        {/* Builder layout */}
        <div className="flex gap-4 h-[calc(100vh-280px)]">
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
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700 truncate">
                    {selectedSeccionId
                      ? secciones.find((s) => s.id === selectedSeccionId)?.nombre ?? "Sección"
                      : "Sin sección"}
                  </h3>
                  {selectedSeccionId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      title="Editar sección"
                      onClick={() => openEditSeccion(selectedSeccionId)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {(() => {
                  const desc = selectedSeccionId
                    ? secciones.find((s) => s.id === selectedSeccionId)?.descripcion
                    : null
                  return desc ? (
                    <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-2">{desc}</p>
                  ) : null
                })()}
                <p className="text-xs text-muted-foreground mt-0.5">
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
                (() => {
                  const ordenados = [...camposEnSeccion].sort((a, b) => a.orden - b.orden)
                  return ordenados.map((campo, idx) => (
                    <CampoCard
                      key={campo.id}
                      campo={campo}
                      planillaId={id}
                      previousCampo={idx > 0 ? ordenados[idx - 1] : null}
                      nextCampo={idx < ordenados.length - 1 ? ordenados[idx + 1] : null}
                    />
                  ))
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
