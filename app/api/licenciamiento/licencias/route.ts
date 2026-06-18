import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/licenciamiento/licencias → { licenciasBase }
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/licenciamiento/licencias")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/licenciamiento/licencias  Body: { licenciasBase }
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/licenciamiento/licencias", {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
