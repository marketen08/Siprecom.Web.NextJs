import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/areas/[id]/elementos — asignados al área.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/areas/[id]/elementos">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/areas/${id}/elementos`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/areas/[id]/elementos — asigna { elementoIds: [] }.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/areas/[id]/elementos">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/areas/${id}/elementos`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
