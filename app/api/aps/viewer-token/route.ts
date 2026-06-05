import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/aps/viewer-token")
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
