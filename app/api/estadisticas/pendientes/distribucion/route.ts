import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

const PARAMS = ["groupBy", "soloAbiertos"] as const

// GET /api/estadisticas/pendientes/distribucion?groupBy=...&soloAbiertos=...
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const key of PARAMS) {
    const v = sp.get(key)
    if (v) qs.set(key, v)
  }
  const path = qs.toString()
    ? `/estadisticas/pendientes/distribucion?${qs.toString()}`
    : "/estadisticas/pendientes/distribucion"

  const res = await backendFetch(request, path)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
