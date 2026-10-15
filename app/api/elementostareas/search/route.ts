import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementostareas/search → listado con filtros (body).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const res = await backendFetch(request, "/elementos-tareas/search", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
