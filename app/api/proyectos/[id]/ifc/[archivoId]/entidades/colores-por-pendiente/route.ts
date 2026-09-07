import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/[archivoId]/entidades/colores-por-pendiente
// Body: ProyectoIfcFiltroInput — el mismo del resto de los endpoints del visor.
//
// Devuelve buckets de piezas por categoría del punch (A/B/C/D) del pendiente
// abierto más crítico de cada Elemento.
//
// Tipo de context sin RouteContext<> porque la ruta es nueva y los types
// generados por Next no la tienen todavía.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string }> },
) {
  const { id, archivoId } = await context.params
  const body = await request.text()
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/colores-por-pendiente`,
    { method: "POST", body },
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
