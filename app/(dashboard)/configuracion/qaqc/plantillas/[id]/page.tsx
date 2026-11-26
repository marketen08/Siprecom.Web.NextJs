"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useArbol } from "@/features/qaqc/api/use-qaqc"
import { Encabezado, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import { EditorPie } from "@/features/qaqc/components/editor-pie"
import { EstadoPlantilla, ESTADO_PLANTILLA_LABEL } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"

/** Editor de una plantilla del catálogo. Los cambios no llegan a los proyectos que ya la copiaron. */
export default function PlantillaPiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data } = useArbol(id)
  const { catalogo } = usePermisosQaqc()

  useBreadcrumb(data ? [
    { label: "Configuración" },
    { label: "Plantillas de PIE", href: "/configuracion/qaqc/plantillas" },
    { label: `${data.codigo} rev. ${data.revision}` },
  ] : null)

  return (
    <div className="space-y-4">
      <Encabezado
        titulo={data ? `${data.codigo} · rev. ${data.revision}` : "Plantilla de PIE"}
        descripcion={data
          ? <>Estado: <strong>{ESTADO_PLANTILLA_LABEL[data.estado]}</strong>. {data.estado === EstadoPlantilla.Vigente ? "Los proyectos nuevos copian esta versión; los que ya la copiaron no ven estos cambios." : "Los proyectos solo pueden copiar plantillas vigentes."}</>
          : ""}
      >
        <Button variant="outline" asChild><Link href="/configuracion/qaqc/plantillas"><ArrowLeft className="h-4 w-4" /> Plantillas</Link></Button>
      </Encabezado>
      <EditorPie pieId={id} puedeEditar={catalogo} />
    </div>
  )
}
