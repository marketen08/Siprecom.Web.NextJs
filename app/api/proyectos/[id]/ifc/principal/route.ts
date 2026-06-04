import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/ifc/principal
// Devuelve el IFC principal del proyecto, o el más reciente si no hay principal
// marcado.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/principal">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/ifc/principal`)
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
