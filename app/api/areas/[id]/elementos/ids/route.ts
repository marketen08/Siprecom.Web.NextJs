import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/areas/[id]/elementos/ids?subSistemaId=&elementoTipoId=&especialidadId=&search=
// Solo IDs de asignados matched — se usa para "seleccionar todos los N que coinciden".
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/areas/[id]/elementos/ids">
) {
  const { id } = await context.params
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/areas/${id}/elementos/ids${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
