import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Equipos de administración: dueños del catálogo de planillas. ABM de AdminGlobal.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/equipos")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/equipos", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
