import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/eliminadas → lista planillas soft-deleted. SuperAdmin.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/planillas/eliminadas")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
