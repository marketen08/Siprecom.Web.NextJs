import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/no-usadas/preview → planillas no referenciadas + campos huérfanos. SuperAdmin.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/planillas/no-usadas/preview")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
