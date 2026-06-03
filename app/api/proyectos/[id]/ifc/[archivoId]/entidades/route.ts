import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/ifc/[archivoId]/entidades
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/entidades">,
) {
  const { id, archivoId } = await context.params
  const qs = request.nextUrl.search // ?page=&pageSize=&filtro=&busqueda=
  const res = await backendFetch(request, `/proyectos/${id}/ifc/${archivoId}/entidades${qs}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
