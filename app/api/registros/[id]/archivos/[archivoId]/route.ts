import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// DELETE /api/registros/[id]/archivos/[archivoId]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/archivos/[archivoId]">
) {
  const { id, archivoId } = await context.params
  // El motivo viene por query string y hay que reenviarlo: el backend lo exige cuando el
  // registro ya está firmado.
  const motivo = request.nextUrl.searchParams.get("motivo")
  const qs = motivo ? `?motivo=${encodeURIComponent(motivo)}` : ""
  const res = await backendFetch(request, `/registros/${id}/archivos/${archivoId}${qs}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
