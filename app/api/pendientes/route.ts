import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/pendientes  — crear pendiente
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/pendientes", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
