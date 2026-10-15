import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// De qué equipo toma el proyecto su catálogo de planillas. No cambia quién lo administra.
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/equipo">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/proyectos/${id}/equipo`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
