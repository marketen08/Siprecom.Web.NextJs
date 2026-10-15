import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/hitos-tareas — hitos agrupados por Nivel → Tarea.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/avance/hitos-tareas")
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = { message: text } }
  return Response.json(data, { status: res.status })
}
