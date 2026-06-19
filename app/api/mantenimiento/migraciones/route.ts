import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/mantenimiento/migraciones → estado (aplicadas vs pendientes). Solo SuperAdmin (backend).
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/mantenimiento/migraciones")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
