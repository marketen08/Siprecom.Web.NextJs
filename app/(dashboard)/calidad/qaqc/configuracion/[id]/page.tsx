"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useArbol } from "@/features/qaqc/api/use-qaqc"
import { Encabezado, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import { EditorPie } from "@/features/qaqc/components/editor-pie"

import { Button } from "@/components/ui/button"

/** Estructura del PIE de un proyecto: la copia de la plantilla, ajustable sin tocar el catálogo. */
export default function EstructuraPieProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data } = useArbol(id)
  const { gestion } = usePermisosQaqc()

  useBreadcrumb(data ? [
    { label: "Calidad" },
    { label: "PIE del proyecto", href: "/calidad/qaqc/configuracion" },
    { label: data.disciplina ?? data.codigo },
  ] : null)

  return (
    <div className="space-y-4">
      <Encabezado
        titulo={data ? `Estructura · ${data.disciplina ?? data.nombre}` : "Estructura del PIE"}
        descripcion="Los cambios quedan en este proyecto. Lo que ya tiene firmas, registros o documentos no se puede quitar: un punto así se marca como No aplica desde la ejecución."
      >
        <Button variant="outline" asChild><Link href={`/calidad/qaqc/pie/${id}`}><ArrowLeft className="h-4 w-4" /> Volver al PIE</Link></Button>
      </Encabezado>
      <EditorPie pieId={id} puedeEditar={gestion} />
    </div>
  )
}
