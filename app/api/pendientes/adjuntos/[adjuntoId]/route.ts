import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/adjuntos/[adjuntoId]">,
) {
  const { adjuntoId } = await context.params
  const res = await backendFetch(request, `/pendientes/adjuntos/${adjuntoId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
