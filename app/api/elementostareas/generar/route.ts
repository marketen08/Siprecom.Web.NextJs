import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementostareas/generar → materializa la selección enviada.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/elementostareas/generar", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
