import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/usuarios/[id]/proyectos/bulk — asigna varios proyectos en un round-trip.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/proyectos/bulk">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/auth/users/${id}/proyectos/bulk`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown
  try { data = text ? JSON.parse(text) : { message: "OK" } } catch { data = { message: text } }
  return Response.json(data, { status: res.status })
}
