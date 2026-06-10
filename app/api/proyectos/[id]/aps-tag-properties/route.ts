import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/proyectos/[id]/aps-tag-properties
// Setea solo el CSV de property names para el matching APS del proyecto.
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/aps-tag-properties">,
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/proyectos/${id}/aps-tag-properties`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
