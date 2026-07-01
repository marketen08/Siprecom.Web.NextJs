import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/testgroups/[id]/elementos-disponibles?subSistemaId=&search=
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/elementos-disponibles">
) {
  const { id } = await context.params
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/testgroups/${id}/elementos-disponibles${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
