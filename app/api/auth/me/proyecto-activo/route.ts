import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/auth/me/proyecto-activo
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/auth/me/proyecto-activo", {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
