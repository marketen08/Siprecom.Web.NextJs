import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/parada-dashboard → KPIs + serie temporal
//
// Se reenvía ?ahora= tal cual: el backend lo acepta para poder reproducir un
// momento pasado, que es lo que hace falta cuando alguien reporta algo que vio
// ayer y el dashboard ya cambió.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/parada-dashboard">,
) {
  const { id } = await context.params
  const ahora = request.nextUrl.searchParams.get("ahora")
  const qs = ahora ? `?ahora=${encodeURIComponent(ahora)}` : ""

  const res = await backendFetch(request, `/proyectos/${id}/parada-dashboard${qs}`)
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
