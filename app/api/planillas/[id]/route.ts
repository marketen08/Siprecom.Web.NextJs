import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/planillas/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]">
) {
  const { id } = await context.params
  // eliminarCamposSinUso: el checkbox del diálogo de borrado. Se reenvía explícito (y no
  // propagando toda la query) para no pasarle al backend nada que no esperemos.
  const limpiar = request.nextUrl.searchParams.get("eliminarCamposSinUso") === "true"
  const res = await backendFetch(
    request,
    `/planillas/${id}${limpiar ? "?eliminarCamposSinUso=true" : ""}`,
    { method: "DELETE" },
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
