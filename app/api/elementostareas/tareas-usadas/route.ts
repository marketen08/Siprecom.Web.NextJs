import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/elementostareas/tareas-usadas → nombres de Tareas efectivamente
// asignadas a alguna ET del proyecto activo del user.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/elementos-tareas/tareas-usadas")
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
