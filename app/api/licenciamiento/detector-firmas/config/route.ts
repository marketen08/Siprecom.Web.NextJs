import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/licenciamiento/detector-firmas/config → 4 valores tuneables
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/licenciamiento/detector-firmas/config")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/licenciamiento/detector-firmas/config  Body: { umbralDensidadPct, margenFiducial, capSuperior, anchoMinimo }
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/licenciamiento/detector-firmas/config", {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
