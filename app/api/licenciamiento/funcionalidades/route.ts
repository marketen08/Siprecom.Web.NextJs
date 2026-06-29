import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/licenciamiento/funcionalidades → estado global de cada funcionalidad
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/licenciamiento/funcionalidades")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/licenciamiento/funcionalidades  Body: { clave, habilitada }
export async function PUT(request: NextRequest) {
  const body = await request.text()
  const res = await backendFetch(request, "/licenciamiento/funcionalidades", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
