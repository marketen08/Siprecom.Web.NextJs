import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/registros/[id]/completar/digital
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/completar/digital">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/registros/${id}/completar/digital`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
