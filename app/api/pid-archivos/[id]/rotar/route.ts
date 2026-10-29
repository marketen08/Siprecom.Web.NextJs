import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/pid-archivos/[id]/rotar — gira el PDF ya cargado (90/180/270) y con
// él las coordenadas de los pines de pendientes.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/pid-archivos/[id]/rotar">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/pid-archivos/${id}/rotar`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
  const data = await res.json().catch(() => ({ message: "Error al rotar el PID" }))
  return Response.json(data, { status: res.status })
}
