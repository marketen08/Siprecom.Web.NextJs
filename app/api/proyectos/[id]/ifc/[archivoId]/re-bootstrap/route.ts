import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/[archivoId]/re-bootstrap
// Re-bootstrap limpio: borra la estructura del proyecto y re-corre el bootstrap.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/re-bootstrap">,
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/ifc/${archivoId}/re-bootstrap`, {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
