import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/auth/profile/password", {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
