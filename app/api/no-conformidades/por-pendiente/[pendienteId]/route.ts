import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/no-conformidades/por-pendiente/{pendienteId}
// Alimenta el badge "este pendiente tiene NC" en el detalle del pendiente.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/no-conformidades/por-pendiente/[pendienteId]">,
) {
  const { pendienteId } = await context.params
  const res = await backendFetch(request, `/no-conformidades/por-pendiente/${pendienteId}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
