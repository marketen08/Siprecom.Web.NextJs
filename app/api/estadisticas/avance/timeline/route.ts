import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/estadisticas/avance/timeline
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/estadisticas/avance/timeline")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
