import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/usuarios-roles/desde-grupo
// Bulk-add: asigna un rol de firma a todos los miembros del grupo.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/proyectos/${id}/usuarios-roles/desde-grupo`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
