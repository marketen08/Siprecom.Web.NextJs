import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/elementostipos/usados
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/elementostipos/usados")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
