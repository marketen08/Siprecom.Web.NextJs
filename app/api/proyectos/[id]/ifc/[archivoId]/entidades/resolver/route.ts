import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/[archivoId]/entidades/resolver
// Body: { ifcGuids: string[] }
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/entidades/resolver">,
) {
  const { id, archivoId } = await context.params
  const body = await request.text()
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/resolver`,
    { method: "POST", body },
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
