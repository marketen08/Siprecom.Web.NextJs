import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/mantenimiento/avance-demo/generar  body: { proyectoId }
export async function POST(request: NextRequest) {
  const body = await request.text()
  const res = await backendFetch(request, "/mantenimiento/avance-demo/generar", {
    method: "POST",
    body,
  })
  const data = await res.json().catch(() => ({ error: "Error" }))
  return Response.json(data, { status: res.status })
}
