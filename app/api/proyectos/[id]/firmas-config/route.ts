import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/firmas-config
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/firmas-config">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/firmas-config`)
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}

// POST /api/proyectos/[id]/firmas-config
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/firmas-config">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/proyectos/${id}/firmas-config`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
