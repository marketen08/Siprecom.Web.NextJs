import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/pendientes-estados")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
