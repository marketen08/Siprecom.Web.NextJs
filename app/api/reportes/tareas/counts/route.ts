import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/reportes/tareas/counts?filtros...
// Contadores por bucket para los chips de /ejecucion/tareas.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/reportes/tareas/counts${search}`)
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
