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
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    const snippet = text.slice(0, 500)
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${snippet}` },
      { status: res.status || 500 }
    )
  }
  const data = JSON.parse(text)
  return Response.json(data, { status: res.status })
}
