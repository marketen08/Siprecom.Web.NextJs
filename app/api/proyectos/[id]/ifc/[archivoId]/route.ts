import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]">,
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/ifc/${archivoId}`, {
    method: "DELETE",
  })
  const data = await res.json().catch(() => ({ message: "Error al borrar el archivo" }))
  return Response.json(data, { status: res.status })
}
