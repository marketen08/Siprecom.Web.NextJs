import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/databooks/jobs — lista de databooks del usuario actual.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/databooks/jobs")
  const data = await res.json().catch(() => [])
  return Response.json(data, { status: res.status })
}
