import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Mueve la planilla a otro equipo de administración, o la pasa a global (equipoId vacío).
// Solo AdminGlobal — el backend lo valida.
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]/equipo">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/planillas/${id}/equipo`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
