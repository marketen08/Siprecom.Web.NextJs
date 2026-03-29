import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/usuarios/[id]/proyectos
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/proyectos">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/auth/users/${id}/proyectos`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/usuarios/[id]/proyectos
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/proyectos">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/auth/users/${id}/proyectos`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
