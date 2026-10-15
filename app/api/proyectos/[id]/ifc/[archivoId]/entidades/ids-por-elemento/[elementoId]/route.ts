import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/ifc/[archivoId]/entidades/ids-por-elemento/[elementoId]
// dbIds de las piezas del elemento, para seleccionar y encuadrar sin índice.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string; elementoId: string }> },
) {
  const { id, archivoId, elementoId } = await context.params
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/ids-por-elemento/${elementoId}`,
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
