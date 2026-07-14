"use client"

import { useParams } from "next/navigation"
import { ProyectoDetalle } from "@/features/proyectos/components/proyecto-detalle"

// Detalle del proyecto abierto desde el contexto Alcance ("Proyecto" = el activo
// del usuario). El breadcrumb queda como Alcance → Proyecto → {nombre}.
export default function AlcanceProyectoDetallePage() {
  const { id } = useParams<{ id: string }>()
  return <ProyectoDetalle id={id} contexto="alcance" />
}
