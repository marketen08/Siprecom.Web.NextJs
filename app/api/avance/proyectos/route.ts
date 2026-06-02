import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/proyectos — avance resumen de todos los proyectos accesibles.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/avance/proyectos")
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = { message: text } }
  return Response.json(data, { status: res.status })
}
