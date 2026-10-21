import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/proyectos/{id}/calidad-seguimiento
// Área de seguimiento que el alta de un informe de calidad propone por defecto.
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/calidad-seguimiento">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/proyectos/${id}/calidad-seguimiento`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
