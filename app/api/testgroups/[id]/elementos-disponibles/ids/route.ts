import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/testgroups/[id]/elementos-disponibles/ids?subSistemaId=&elementoTipoId=&especialidadId=&search=
// Devuelve solo los IDs matched — se usa para "seleccionar todos los N que coinciden".
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/elementos-disponibles/ids">
) {
  const { id } = await context.params
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/testgroups/${id}/elementos-disponibles/ids${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
