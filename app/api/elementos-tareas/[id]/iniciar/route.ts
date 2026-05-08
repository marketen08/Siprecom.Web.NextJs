import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementos-tareas/[id]/iniciar
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/[id]/iniciar">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/elementos-tareas/${id}/iniciar`, { method: "POST" })
  // Si el backend devolvió HTML (página de error de ASP.NET) en vez de JSON, lo
  // surfaceamos como mensaje legible en lugar de explotar al parsear.
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    const snippet = text.slice(0, 500)
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${snippet}` },
      { status: res.status || 500 }
    )
  }
  const data = JSON.parse(text)
  return Response.json(data, { status: res.status })
}
