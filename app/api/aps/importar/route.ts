import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const res = await backendFetch(request, "/aps/importar", { method: "POST", body })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
