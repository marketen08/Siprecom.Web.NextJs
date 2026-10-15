import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/parada-config → ventana y parámetros de la parada
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/parada-config">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/parada-config`)
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}

// PUT /api/proyectos/[id]/parada-config
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/parada-config">,
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/proyectos/${id}/parada-config`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
