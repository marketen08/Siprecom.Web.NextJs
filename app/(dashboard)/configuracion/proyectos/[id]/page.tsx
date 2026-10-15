"use client"

import { useParams } from "next/navigation"
import { ProyectoDetalle } from "@/features/proyectos/components/proyecto-detalle"

// Detalle del proyecto abierto desde la lista global (Configuración → Proyectos).
// El breadcrumb queda como Configuración → Proyectos → {nombre}.
export default function ConfiguracionProyectoDetallePage() {
  const { id } = useParams<{ id: string }>()
  return <ProyectoDetalle id={id} contexto="config" />
}
