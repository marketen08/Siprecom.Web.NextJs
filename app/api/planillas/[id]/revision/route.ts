import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planillas/[id]/revision → pone el tilde de "revisada". DELETE lo saca.
// Lo puede hacer quien puede editar la planilla — el backend lo valida.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/revision`, { method: "POST" })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/revision`, { method: "DELETE" })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
