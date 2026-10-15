import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/no-conformidades/search — listado paginado con filtros.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/no-conformidades/search", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
