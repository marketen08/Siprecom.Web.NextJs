import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/import-json/preview
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/import-json/preview">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/proyectos/${id}/ifc/import-json/preview`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!text || !ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} sin JSON: ${text.slice(0, 200) || "(vacío)"}` },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
