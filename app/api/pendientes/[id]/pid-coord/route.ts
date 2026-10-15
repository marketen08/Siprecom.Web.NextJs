import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/pendientes/[id]/pid-coord — mover el pin del pendiente sobre su PID.
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/[id]/pid-coord">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/pendientes/${id}/pid-coord`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
