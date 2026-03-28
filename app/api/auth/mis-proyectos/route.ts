import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/auth/mis-proyectos
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/auth/mis-proyectos")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
