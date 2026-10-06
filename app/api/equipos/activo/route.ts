import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Cambia el equipo de trabajo del propio usuario.
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/equipos/activo", {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
