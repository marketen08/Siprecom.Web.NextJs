import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/areas/[id]/elementos-disponibles?subSistemaId=&elementoTipoId=&especialidadId=&search=
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/areas/[id]/elementos-disponibles">
) {
  const { id } = await context.params
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/areas/${id}/elementos-disponibles${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
