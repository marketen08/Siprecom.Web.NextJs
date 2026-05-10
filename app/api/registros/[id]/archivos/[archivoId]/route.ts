import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// DELETE /api/registros/[id]/archivos/[archivoId]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/archivos/[archivoId]">
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(request, `/registros/${id}/archivos/${archivoId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
