import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/pendientes-autorizacion">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/pendientes-autorizacion`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/pendientes-autorizacion">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/proyectos/${id}/pendientes-autorizacion`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
