import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(request: NextRequest) {
  const res = await backendFetch(request, "/aps/disconnect", { method: "POST" })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
