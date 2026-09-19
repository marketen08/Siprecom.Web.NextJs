import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/pendientes-autorizacion">,
) {
  const { id } = await context.params
  const ambitoId = request.nextUrl.searchParams.get("ambitoId") ?? ""
  const res = await backendFetch(request, `/proyectos/${id}/pendientes-autorizacion?ambitoId=${encodeURIComponent(ambitoId)}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/pendientes-autorizacion">,
) {
  const { id } = await context.params
  const body = await request.json()
  const ambitoId = request.nextUrl.searchParams.get("ambitoId") ?? ""
  const res = await backendFetch(request, `/proyectos/${id}/pendientes-autorizacion?ambitoId=${encodeURIComponent(ambitoId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
