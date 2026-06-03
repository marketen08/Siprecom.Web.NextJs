import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/ifc/[archivoId]/download → { data: { url, nombreArchivo, expiraEnMinutos } }
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/download">,
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/ifc/${archivoId}/download`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
