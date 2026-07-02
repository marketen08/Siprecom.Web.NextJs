import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// DELETE /api/areas/[id]/elementos/[elementoId]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/areas/[id]/elementos/[elementoId]">
) {
  const { id, elementoId } = await context.params
  const res = await backendFetch(request, `/areas/${id}/elementos/${elementoId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
