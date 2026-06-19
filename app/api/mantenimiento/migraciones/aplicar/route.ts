import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/mantenimiento/migraciones/aplicar → aplica las migraciones pendientes. Solo SuperAdmin (backend).
export async function POST(request: NextRequest) {
  const res = await backendFetch(request, "/mantenimiento/migraciones/aplicar", {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
