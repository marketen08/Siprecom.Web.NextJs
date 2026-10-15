import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/licenciamiento/ia-config → { habilitada, maxPorUsuarioPorDia }
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/licenciamiento/ia-config")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/licenciamiento/ia-config  Body: { habilitada, maxPorUsuarioPorDia }
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/licenciamiento/ia-config", {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
