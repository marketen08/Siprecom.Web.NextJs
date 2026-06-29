import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/funcionalidades → estado global/proyecto/efectivo
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/funcionalidades">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/funcionalidades`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PATCH /api/proyectos/[id]/funcionalidades  Body: { clave, habilitada }
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/funcionalidades">,
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/proyectos/${id}/funcionalidades`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
