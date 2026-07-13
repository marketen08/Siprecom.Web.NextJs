import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planillas/no-usadas/eliminar → borra planillas no referenciadas + campos huérfanos. SuperAdmin.
export async function POST(request: NextRequest) {
  const res = await backendFetch(request, "/planillas/no-usadas/eliminar", { method: "POST" })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
