import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

const PARAMS = ["sistemaId", "nivelId", "especialidadId"] as const

// GET /api/estadisticas/avance-por-subsistema?sistemaId=...&nivelId=...&especialidadId=...
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const key of PARAMS) {
    const v = sp.get(key)
    if (v) qs.set(key, v)
  }
  const path = qs.toString()
    ? `/estadisticas/avance-por-subsistema?${qs.toString()}`
    : "/estadisticas/avance-por-subsistema"

  const res = await backendFetch(request, path)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
