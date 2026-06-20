import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/uso-referencias → conteo de Tareas/Registros que usan planillas. Solo SuperAdmin (backend).
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/planillas/uso-referencias")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
