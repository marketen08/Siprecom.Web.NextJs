import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/[archivoId]/rematch
// Re-vincula bulk las entidades del modelo contra los Elementos actuales del
// proyecto por TAG. NO destructivo — solo toca entidades sin vincular.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/rematch">,
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/ifc/${archivoId}/rematch`, {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
