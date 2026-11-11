import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementos-tareas/[id]/reiniciar
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/[id]/reiniciar">
) {
  const { id } = await context.params
  // El body lleva el motivo, que el backend exige cuando se descarta un registro ya
  // cerrado con las firmas del papel. Sin reenviarlo, ese caso rebota siempre.
  const body = await request.text()
  const res = await backendFetch(request, `/elementos-tareas/${id}/reiniciar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
