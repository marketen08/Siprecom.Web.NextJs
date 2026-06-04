import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/proyectos/[id]/ifc/[archivoId]/principal
// Marca este archivo como el IFC principal del proyecto (desmarca los otros).
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/principal">,
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/principal`,
    { method: "PUT" },
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
