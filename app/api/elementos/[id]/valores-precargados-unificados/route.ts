import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/elementos/[id]/valores-precargados-unificados">,
) {
  const { id } = await context.params
  const res = await backendFetch(
    request,
    `/elementos/${id}/valores-precargados-unificados`,
  )
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 500)}` },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/elementos/[id]/valores-precargados-unificados">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(
    request,
    `/elementos/${id}/valores-precargados-unificados`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  )
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 500)}` },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
