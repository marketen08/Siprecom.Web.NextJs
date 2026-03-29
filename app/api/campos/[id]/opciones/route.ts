import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/campos/[id]/opciones">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/campos/${id}/opciones`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/campos/[id]/opciones">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/campos/${id}/opciones`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
