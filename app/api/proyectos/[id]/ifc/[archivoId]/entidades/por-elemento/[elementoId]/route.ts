import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/ifc/[archivoId]/entidades/por-elemento/[elementoId]
// Devuelve los IfcGuid del archivo vinculados a ese Elemento (para seleccionar
// la línea/equipo completo en el visor).
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/entidades/por-elemento/[elementoId]">,
) {
  const { id, archivoId, elementoId } = await context.params
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/por-elemento/${elementoId}`,
    { method: "GET" },
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
