import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/usuarios/[id]/proyectos/bulk-remove — desasigna varios en batch.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/proyectos/bulk-remove">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/auth/users/${id}/proyectos/bulk-remove`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown
  try { data = text ? JSON.parse(text) : { message: "OK" } } catch { data = { message: text } }
  return Response.json(data, { status: res.status })
}
