import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/proyectos/[id]/nivel-mc — setea Proyecto.NivelMcId. null desconfigura.
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/nivel-mc">,
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/proyectos/${id}/nivel-mc`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
