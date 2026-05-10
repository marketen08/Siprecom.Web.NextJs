import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/subsistemas/[id]/niveles">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/subsistemas/${id}/niveles`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/subsistemas/[id]/niveles">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/subsistemas/${id}/niveles`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
